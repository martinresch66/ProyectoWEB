<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Convenio;
use App\Models\DetallePasantia;
use App\Models\TransicionEstado;
use App\Models\VinculoConvenio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConvenioController extends Controller
{
    /**
     * GET /api/agreements
     */
    public function index(Request $request)
    {
        $query = Convenio::visiblePara($request->user())->with(['unidad', 'creador']);

        if ($request->filled('q')) {
            $q = $request->input('q');
            $query->where(function ($sub) use ($q) {
                $sub->where('codigo', 'like', "%{$q}%")
                    ->orWhere('titulo', 'like', "%{$q}%")
                    ->orWhere('resumen', 'like', "%{$q}%");
            });
        }

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('unidad_id')) {
            $query->where('unidad_id', $request->unidad_id);
        }

        if ($request->filled('desde')) {
            $query->where('fecha_inicio', '>=', $request->desde);
        }
        if ($request->filled('hasta')) {
            $query->where('fecha_inicio', '<=', $request->hasta);
        }

        // Vigencia: vigente | proximo | vencido | sin_vencimiento
        if ($request->filled('vigencia')) {
            $hoy = now()->toDateString();
            switch ($request->vigencia) {
                case 'sin_vencimiento':
                    $query->whereNull('fecha_fin');
                    break;
                case 'vencido':
                    $query->where('fecha_fin', '<', $hoy);
                    break;
                case 'proximo':
                    $query->where('fecha_fin', '>=', $hoy)
                          ->whereRaw('DATEDIFF(fecha_fin, ?) <= COALESCE(dias_preaviso, 0)', [$hoy]);
                    break;
                case 'vigente':
                    $query->where('fecha_fin', '>=', $hoy)
                          ->whereRaw('DATEDIFF(fecha_fin, ?) > COALESCE(dias_preaviso, 0)', [$hoy]);
                    break;
            }
        }

        $perPage = min((int) $request->input('per_page', 10), 100);

        return $this->success($query->orderByDesc('id')->paginate($perPage), 'Lista de convenios obtenida correctamente');
    }

    /**
     * POST /api/agreements
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->rol, ['admin', 'gestion'])) {
            return $this->error('No tiene permisos para crear convenios', 403);
        }

        if ($user->rol === 'gestion' && $request->input('unidad_id') != $user->unidad_id) {
            return $this->error('No tiene permisos para crear convenios en otra unidad académica', 403);
        }

        // Normalizar el antecedente que manda el formulario de Next.js
        $origenId = $request->input('convenio_origen_id')
                 ?? $request->input('convenio_destino_id')
                 ?? $request->input('convenio_padre_id')
                 ?? $request->input('convenio_antecedente_id');

        if ($origenId) {
            $request->merge(['convenio_origen_id' => $origenId]);
        }

        $tipo = $request->input('tipo');

        $validatedData = $request->validate([
            'codigo'              => 'required|string|unique:convenios,codigo',
            'titulo'              => 'required|string|min:5|max:255',
            'tipo'                => 'required|string|in:marco,especifico,adenda,pasantia',
            'unidad_id'           => 'required|exists:unidades,id',
            'resumen'             => 'nullable|string',
            'fecha_inicio'        => 'nullable|date',
            'fecha_fin'           => 'nullable|date|after_or_equal:fecha_inicio',
            'dias_preaviso'       => 'nullable|integer|between:0,365',
            'convenio_origen_id'  => 'nullable|exists:convenios,id',
            'partes'              => 'nullable|array',
            'personas'            => 'nullable|array',
            'detalle_pasantia'    => 'nullable|array',
        ]);

        $convenio = DB::transaction(function () use ($validatedData, $user, $tipo, $request) {
            $convenio = Convenio::create([
                'codigo'        => $validatedData['codigo'],
                'titulo'        => $validatedData['titulo'],
                'tipo'          => $validatedData['tipo'],
                'estado'        => 'borrador',
                'unidad_id'     => $validatedData['unidad_id'],
                'resumen'       => $validatedData['resumen'] ?? null,
                'fecha_inicio'  => $validatedData['fecha_inicio'] ?? null,
                'fecha_fin'     => $validatedData['fecha_fin'] ?? null,
                'dias_preaviso' => $validatedData['dias_preaviso'] ?? 30,
                'version'       => 1,
                'creado_por'    => $user->id,
            ]);

            // Vínculo con el antecedente, si viene
            if (!empty($validatedData['convenio_origen_id'])) {
                $tipoVinculo = $request->input('tipo_vinculo')
                            ?? ($tipo === 'adenda' ? 'adenda_de' : 'especifico_de');

                VinculoConvenio::create([
                    'convenio_origen_id'  => $convenio->id,
                    'convenio_destino_id' => $validatedData['convenio_origen_id'],
                    'tipo_vinculo'        => $tipoVinculo,
                ]);
            }

            $this->sincronizarPartes($convenio, $validatedData['partes'] ?? null);
            $this->sincronizarPersonas($convenio, $validatedData['personas'] ?? null);

            if ($tipo === 'pasantia' && !empty($validatedData['detalle_pasantia'])) {
                $this->guardarDetallePasantia($convenio, $validatedData['detalle_pasantia']);
            }

            return $convenio;
        });

        return $this->success(
            $this->cargarFicha($convenio->id, $user),
            'Convenio creado correctamente',
            201
        );
    }

    /**
     * GET /api/agreements/{id}
     */
    public function show(Request $request, $id)
    {
        $convenio = $this->cargarFicha($id, $request->user());

        if (!$convenio) {
            return $this->error('Convenio no encontrado', 404);
        }

        return $this->success($convenio, 'Detalle del convenio obtenido correctamente');
    }

    /**
     * PUT /api/agreements/{id}
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->rol, ['admin', 'gestion'])) {
            return $this->error('No tiene permisos para editar convenios', 403);
        }

        $existente = Convenio::visiblePara($user)->find($id);

        if (!$existente) {
            return $this->error('Convenio no encontrado', 404);
        }

        if ($existente->estado !== 'borrador') {
            return $this->error('Solo se pueden editar convenios en estado borrador', 422);
        }

        if ($user->rol === 'gestion'
            && $request->filled('unidad_id')
            && (int) $request->input('unidad_id') !== (int) $user->unidad_id) {
            return $this->error('No tiene permisos para mover el convenio a otra unidad académica', 403);
        }

        $validatedData = $request->validate([
            'version'          => 'required|integer',
            'codigo'           => 'sometimes|string|unique:convenios,codigo,' . $id,
            'titulo'           => 'sometimes|string|min:5|max:255',
            'tipo'             => 'sometimes|string|in:marco,especifico,adenda,pasantia',
            'unidad_id'        => 'sometimes|exists:unidades,id',
            'resumen'          => 'nullable|string',
            'fecha_inicio'     => 'nullable|date',
            'fecha_fin'        => 'nullable|date|after_or_equal:fecha_inicio',
            'dias_preaviso'    => 'nullable|integer|between:0,365',
            'partes'           => 'nullable|array',
            'personas'         => 'nullable|array',
            'detalle_pasantia' => 'nullable|array',
        ]);

        $conflicto = false;

        DB::transaction(function () use ($id, $validatedData, &$conflicto) {
            // Bloqueo de fila: dos ediciones simultáneas no pasan las dos
            $convenio = Convenio::lockForUpdate()->find($id);

            if ((int) $validatedData['version'] !== (int) $convenio->version) {
                $conflicto = true;
                return;
            }

            $campos = collect($validatedData)
                ->except(['version', 'partes', 'personas', 'detalle_pasantia'])
                ->all();

            $convenio->fill($campos);
            $convenio->version = $convenio->version + 1;
            $convenio->save();

            if (array_key_exists('partes', $validatedData)) {
                $this->sincronizarPartes($convenio, $validatedData['partes']);
            }

            if (array_key_exists('personas', $validatedData)) {
                $this->sincronizarPersonas($convenio, $validatedData['personas']);
            }

            if ($convenio->tipo === 'pasantia' && !empty($validatedData['detalle_pasantia'])) {
                $this->guardarDetallePasantia($convenio, $validatedData['detalle_pasantia']);
            }
        });

        if ($conflicto) {
            return response()->json([
                'success' => false,
                'message' => 'El convenio fue modificado por otro usuario',
                'actual'  => $this->cargarFicha($id, $user),
            ], 409);
        }

        return $this->success($this->cargarFicha($id, $user), 'Convenio actualizado correctamente');
    }

   /**
     * POST /api/agreements/{id}/transitions
     */
    public function transition(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->rol, ['admin', 'gestion', 'revision'])) {
            return $this->error('No tiene permisos para cambiar el estado de convenios', 403);
        }

        $request->validate([
            'estado_nuevo' => 'required|string|in:borrador,revision,aprobado,firmado,rescindido,archivado',
            'motivo'       => 'required|string|min:5',
            'version'      => 'required|integer',
        ]);

        $existente = Convenio::visiblePara($user)->with(['partes', 'observaciones'])->find($id);

        if (!$existente) {
            return $this->error('Convenio no encontrado', 404);
        }

        $estadoActual = $existente->estado;
        $estadoNuevo  = $request->input('estado_nuevo');
        $rol          = $user->rol;

        // Validar Matriz de Permisos y Transiciones
        $transicionValida = false;

        switch ("{$estadoActual}->{$estadoNuevo}") {
            case 'borrador->revision':
                $transicionValida = in_array($rol, ['admin', 'gestion']);
                break;

            case 'borrador->archivado':
                $transicionValida = ($rol === 'admin');
                break;

            case 'revision->aprobado':
                if (in_array($rol, ['admin', 'revision'])) {
                    // Regla extra: al menos 2 partes y 0 observaciones sin resolver
                    $cantPartes = $existente->partes->count();
                    $obsPendientes = $existente->observaciones->where('esta_resuelta', false)->count();

                    if ($cantPartes < 2) {
                        return $this->error('El convenio debe tener al menos 2 partes registradas para ser aprobado', 422);
                    }
                    if ($obsPendientes > 0) {
                        return $this->error('No se puede aprobar: existen observaciones pendientes sin resolver', 422);
                    }
                    $transicionValida = true;
                }
                break;

            case 'revision->borrador':
                if (in_array($rol, ['admin', 'revision'])) {
                    // Regla extra: debe existir al menos 1 observación pendiente
                    $obsPendientes = $existente->observaciones->where('esta_resuelta', false)->count();
                    if ($obsPendientes === 0) {
                        return $this->error('Para devolver a borrador debe registrar al menos una observación sin resolver', 422);
                    }
                    $transicionValida = true;
                }
                break;

            case 'aprobado->firmado':
                $transicionValida = in_array($rol, ['admin', 'gestion']);
                break;

            case 'aprobado->borrador':
            case 'firmado->rescindido':
            case 'firmado->archivado':
            case 'rescindido->archivado':
                $transicionValida = ($rol === 'admin');
                break;
        }

        if (!$transicionValida) {
            return $this->error("Transición de estado de '{$estadoActual}' a '{$estadoNuevo}' no permitida para su rol", 422);
        }

        $conflicto = false;

        DB::transaction(function () use ($id, $request, $user, $estadoNuevo, $estadoActual, &$conflicto) {
            $convenio = Convenio::lockForUpdate()->find($id);

            if ((int) $request->input('version') !== (int) $convenio->version) {
                $conflicto = true;
                return;
            }

            $convenio->estado = $estadoNuevo;
            $convenio->version = $convenio->version + 1;
            $convenio->save();

            TransicionEstado::create([
                'convenio_id'     => $convenio->id,
                'estado_anterior' => $estadoActual,
                'estado_nuevo'    => $estadoNuevo,
                'motivo'          => $request->input('motivo'),
                'cambiado_por'    => $user->id,
            ]);
        });

        if ($conflicto) {
            return response()->json([
                'success' => false,
                'message' => 'El convenio ha sido modificado por otro usuario',
                'actual'  => $this->cargarFicha($id, $user),
            ], 409);
        }

        return $this->success($this->cargarFicha($id, $user), 'Estado actualizado correctamente');
    }

/**
     * GET /api/agreements/export
     */
    public function exportCsv(Request $request)
    {
        $user = $request->user();

        // Aplicar la misma visibilidad por rol y los mismos filtros que en index()
        $query = Convenio::visiblePara($user)->with(['unidad']);

        if ($request->filled('q')) {
            $q = $request->input('q');
            $query->where(function ($sub) use ($q) {
                $sub->where('codigo', 'like', "%{$q}%")
                    ->orWhere('titulo', 'like', "%{$q}%")
                    ->orWhere('resumen', 'like', "%{$q}%");
            });
        }

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('unidad_id')) {
            $query->where('unidad_id', $request->unidad_id);
        }

        if ($request->filled('desde')) {
            $query->where('fecha_inicio', '>=', $request->desde);
        }
        if ($request->filled('hasta')) {
            $query->where('fecha_inicio', '<=', $request->hasta);
        }

        $convenios = $query->orderByDesc('id')->get();

        $filename = 'convenios-' . date('Y-m-d') . '.csv';

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        // Función auxiliar para sanitizar celdas (requisito de seguridad del contrato)
        $sanitizar = function ($valor) {
            $str = (string) ($valor ?? '');
            if ($str !== '' && in_array($str[0], ['=', '+', '-', '@', "\t", "\r"])) {
                return "'" . $str;
            }
            return $str;
        };

        $callback = function () use ($convenios, $sanitizar) {
            $file = fopen('php://output', 'w');

            // BOM UTF-8 para que Excel detecte la codificación correctamente
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // Encabezados de columnas con separador punto y coma (;)
            fputcsv($file, ['Código', 'Título', 'Tipo', 'Estado', 'Unidad Académica', 'Fecha Inicio', 'Fecha Fin'], ';');

            // Filas de datos
            foreach ($convenios as $c) {
                // Parseo seguro de fechas para evitar error 500 en PHP
                $inicio = $c->fecha_inicio ? \Illuminate\Support\Carbon::parse($c->fecha_inicio)->format('Y-m-d') : '-';
                $fin    = $c->fecha_fin ? \Illuminate\Support\Carbon::parse($c->fecha_fin)->format('Y-m-d') : '-';

                fputcsv($file, [
                    $sanitizar($c->codigo),
                    $sanitizar($c->titulo),
                    $sanitizar(ucfirst($c->tipo)),
                    $sanitizar(ucfirst($c->estado)),
                    $sanitizar($c->unidad->nombre ?? 'N/A'),
                    $inicio,
                    $fin,
                ], ';');
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
    // -------------------------------------------------------------------------
    // Helpers privados
    // -------------------------------------------------------------------------

    /**
     * Carga la ficha completa respetando el alcance del usuario.
     * Devuelve null si no existe o no está en su alcance.
     */
    private function cargarFicha($id, $user)
    {
        $convenio = Convenio::visiblePara($user)->with([
            'unidad',
            'creador',
            'partes',
            'personas',
            'detallePasantia.estudiante',
            'detallePasantia.tutorAcademico',
            'detallePasantia.tutorInstitucion',
            'vinculosOrigen.destino',
            'vinculosDestino.origen',
            'documentos',
            'transiciones',
            'observaciones',
        ])->find($id);

        // El rol consulta no debe ver datos de contacto de personas
        if ($convenio && $user->rol === 'consulta') {
            $convenio->personas->each->makeHidden(['dni', 'email', 'telefono']);

            if ($convenio->detallePasantia) {
                foreach (['estudiante', 'tutorAcademico', 'tutorInstitucion'] as $rel) {
                    $convenio->detallePasantia->{$rel}?->makeHidden(['dni', 'email', 'telefono']);
                }
            }
        }

        return $convenio;
    }

    private function sincronizarPartes(Convenio $convenio, ?array $partes): void
    {
        if ($partes === null) {
            return;
        }

        $sync = [];
        foreach ($partes as $p) {
            $parteId = is_array($p) ? ($p['parte_id'] ?? $p['id'] ?? null) : $p;
            $rol = is_array($p) ? ($p['rol_en_convenio'] ?? $p['rol'] ?? null) : null;
            if ($parteId) {
                $sync[$parteId] = ['rol_en_convenio' => $rol];
            }
        }

        $convenio->partes()->sync($sync);
    }

    private function sincronizarPersonas(Convenio $convenio, ?array $personas): void
    {
        if ($personas === null) {
            return;
        }

        $sync = [];
        foreach ($personas as $p) {
            $personaId = is_array($p) ? ($p['persona_id'] ?? $p['id'] ?? null) : $p;
            // La columna `rol` es NOT NULL en personas_convenio
            $rol = is_array($p) ? ($p['rol'] ?? 'Sin especificar') : 'Sin especificar';
            if ($personaId) {
                $sync[$personaId] = ['rol' => $rol];
            }
        }

        $convenio->personas()->sync($sync);
    }

    private function guardarDetallePasantia(Convenio $convenio, array $dp): void
    {
        DetallePasantia::updateOrCreate(
            ['convenio_id' => $convenio->id],
            [
                'estudiante_persona_id'        => $dp['estudiante_persona_id'] ?? null,
                'tutor_academico_persona_id'   => $dp['tutor_academico_persona_id'] ?? null,
                'tutor_institucion_persona_id' => $dp['tutor_institucion_persona_id'] ?? null,
                'carrera'                      => $dp['carrera'] ?? '',
                'horas_semanales'              => $dp['horas_semanales'] ?? null,
                'monto_estimulo'               => $dp['monto_estimulo'] ?? 0,
                'aseguradora'                  => $dp['aseguradora'] ?? null,
                'numero_poliza'                => $dp['numero_poliza'] ?? null,
            ]
        );
    }
}