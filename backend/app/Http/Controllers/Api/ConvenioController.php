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
        $query = Convenio::visiblePara($request->user())->with(['unidad', 'creador']);/*en vez de hacer 1 consulta por cada convenio para buscar el nombre de su unidad y su creador, Laravel trae todos los datos en 3 consultas SQL rápidas. */

        /*Solo agrega cláusulas WHERE si el usuario envió ese filtro desde el frontend ( filled Devuelve true SOLO si 'q' vino en la URL (?q=...) Y no es una cadena vacía ni null. */
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

        // Normalizar antecedente enviado desde el frontend
        $origenId = $request->input('convenio_origen_id')
                 ?? $request->input('convenio_destino_id')
                 ?? $request->input('convenio_padre_id')
                 ?? $request->input('convenio_antecedente_id');

        if ($origenId) {
            $request->merge(['convenio_origen_id' => $origenId]);
        }

        $tipo = $request->input('tipo');
 
        /* - Devuelve en $validatedData ÚNICAMENTE las claves declaradas aquí (descarta campos extra no autorizados).
         */

        $validatedData = $request->validate([
            'codigo'            => 'required|string|unique:convenios,codigo',
            'titulo'            => 'required|string|min:5|max:255',
            'tipo'              => 'required|string|in:marco,especifico,adenda,pasantia',
            'unidad_id'         => 'required|exists:unidades,id',
            'resumen'           => 'nullable|string',
            'fecha_inicio'      => 'nullable|date',
            'fecha_fin'         => 'nullable|date|after_or_equal:fecha_inicio',
            'dias_preaviso'     => 'nullable|integer|between:0,365',
            'convenio_origen_id'=> 'nullable|exists:convenios,id',
            'partes'            => 'nullable|array',
            'personas'          => 'nullable|array',
            'detalle_pasantia'  => 'nullable|array',
        ]);

        /* Aquí se insertan datos en hasta 5 tablas distintas (`convenios`, `vinculos_convenio`,
         *   `partes_convenio`, `personas_convenio`, `detalles_pasantia`). Si ocurre cualquier excepción a mitad de camino,
         *   Laravel ejecuta ROLLBACK automático en MySQL para no dejar registros huérfanos o incompletos.
         */

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

           
            // Si es adenda o específico vinculado a un convenio marco padre, registra la relación en `vinculos_convenio`.
            if (!empty($validatedData['convenio_origen_id'])) {
                $tipoVinculo = $request->input('tipo_vinculo')
                            ?? ($tipo === 'adenda' ? 'adenda_de' : 'especifico_de');

                VinculoConvenio::create([
                    'convenio_origen_id'  => $convenio->id,
                    'convenio_destino_id' => $validatedData['convenio_origen_id'],
                    'tipo_vinculo'        => $tipoVinculo,
                ]);
            }
             // Llama a los helpers privados declarados al final de esta misma clase para poblar tablas pivote e hija 1:1.
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
         // Delega en cargarFicha() que aplica visiblePara($user) + carga relaciones + oculta datos sensibles si el rol es 'consulta'.
        $convenio = $this->cargarFicha($id, $request->user());
 // Si el ID no existe O pertenece a otra facultad fuera del alcance del usuario, devuelve 404
        if (!$convenio) {
            return $this->error('Convenio no encontrado', 404);
        }

        return $this->success($convenio, 'Detalle del convenio obtenido correctamente');
    }

    /**
     * PUT /api/agreements/{id}
     * Edita un borrador con control de concurrencia optimista + pesimista.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->rol, ['admin', 'gestion'])) {
            return $this->error('No tiene permisos para editar convenios', 403);
        }

        // Verifica existencia y alcance por unidad antes de validar.
        existente=Convenio::visiblePara(user)->find($id);

        if (!$existente) {
            return $this->error('Convenio no encontrado', 404);
        }

        // Regla de negocio: una vez enviado a revisión, aprobado o firmado, el texto base es inmutable.
        if ($existente->estado !== 'borrador') {
            return $this->error('Solo se pueden editar convenios en estado borrador', 422);
        }

        // Impide que un gestor transfiera su convenio a otra facultad modificando unidad_id.
        if ($user->rol === 'gestion'
            && $request->filled('unidad_id')
            && (int) $request->input('unidad_id') !== (int) $user->unidad_id) {
            return $this->error('No tiene permisos para mover el convenio a otra unidad académica', 403);
        }

        /*
         * Reglas 'sometimes' vs 'required':
         * - 'version' => 'required|integer': Obligatorio siempre para verificar que el cliente edita la última versión.
         * - 'sometimes': Valida la regla SOLO si el campo fue enviado en el payload (permite actualizaciones parciales).
         * - 'unique:convenios,codigo,' . $id: Excluye el propio registro $id del chequeo de unicidad para que no choque consigo mismo.
         */
        $validatedData = $request->validate([
            'version'         => 'required|integer',
            'codigo'          => 'sometimes|string|unique:convenios,codigo,' . $id,
            'titulo'          => 'sometimes|string|min:5|max:255',
            'tipo'            => 'sometimes|string|in:marco,especifico,adenda,pasantia',
            'unidad_id'       => 'sometimes|exists:unidades,id',
            'resumen'         => 'nullable|string',
            'fecha_inicio'    => 'nullable|date',
            'fecha_fin'       => 'nullable|date|after_or_equal:fecha_inicio',
            'dias_preaviso'   => 'nullable|integer|between:0,365',
            'partes'          => 'nullable|array',
            'personas'        => 'nullable|array',
            'detalle_pasantia'=> 'nullable|array',
        ]);

        // Bandera pasada por referencia (&$conflicto) al Closure de la transacción para saber si hubo colisión de versiones.
        $conflicto = false;

        DB::transaction(function () use ($id, validatedData,&conflicto) {
            /*
             * Control de concurrencia en 2 niveles:
             * 1. Convenio::lockForUpdate()->find($id): Bloqueo PESIMISTA a nivel motor InnoDB (`SELECT ... FOR UPDATE`).
             *    Serializa peticiones que lleguen en el mismo milisegundo para que lean el valor real actualizado.
             * 2. Comparación de `version`: Bloqueo OPTIMISTA. Si otro usuario guardó antes y subió la versión en BD,
             *    los enteros no coinciden, se aborta sin guardar y se activa $conflicto = true.
             */
            convenio=Convenio::lockForUpdate()->find(id);

            if ((int) $validatedData['version'] !== (int) $convenio->version) {
                $conflicto = true;
                return;
            }

            // collect(...)->except([...])->all(): Helper Collection de Laravel que separa las columnas directas de `convenios`
            // quitando los arreglos de relaciones y la versión vieja.
            campos=collect(validatedData)
                ->except(['version', 'partes', 'personas', 'detalle_pasantia'])
                ->all();

            convenio->fill(campos);                     // Asigna los atributos limpios al modelo en memoria.
            $convenio->version = $convenio->version + 1;  // Incrementa la versión para invalidar copias viejas en otras pestañas.
            $convenio->save();                            // Ejecuta el UPDATE en MySQL.

            // array_key_exists() diferencia entre "no enviaron el campo partes" vs "enviaron partes: [] para vaciarlas".
            if (array_key_exists('partes', $validatedData)) {
                this->sincronizarPartes(convenio, $validatedData['partes']);
            }

            if (array_key_exists('personas', $validatedData)) {
                this->sincronizarPersonas(convenio, $validatedData['personas']);
            }

            if (convenio->tipo==='pasantia'&&!empty(validatedData['detalle_pasantia'])) {
                this->guardarDetallePasantia(convenio, $validatedData['detalle_pasantia']);
            }
        });

        // Si hubo colisión, responde HTTP 409 Conflict entregando en 'actual' el estado fresco del servidor
        // para que el frontend arme el comparador de merge campo por campo.
        if ($conflicto) {
            return response()->json([
                'success' => false,
                'message' => 'El convenio fue modificado por otro usuario',
                'actual'  => this->cargarFicha(id, $user),
            ], 409);
        }

        return this->success(this->cargarFicha($id, $user), 'Convenio actualizado correctamente');
    }


     /**
     * DELETE /api/agreements/{id}
     * Eliminación física restringida exclusivamente al administrador.
     */

    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        if ($user->rol !== 'admin') {
            return $this->error('No tiene permisos para eliminar convenios', 403);
        }

        $convenio = Convenio::find($id);

        if (!$convenio) {
            return $this->error('Convenio no encontrado', 404);
        }

        $convenio->delete();

        return response()->json(null, 204);
    }

      /**
     * POST /api/agreements/{id}/transitions
     * valida quién puede mover qué estado y bajo qué precondiciones.
     */

    public function transition(Request $request, $id)
    {
        $user = $request->user();
 
        // El rol 'consulta' jamás puede transicionar estados.
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

        $transicionValida = false;

    /*
         * Grafo de transiciones permitidas ("origen->destino"):
         * Cualquier combinación no contemplada en este switch deja $transicionValida = false y se rechaza con 422.
         */
        switch ("{$estadoActual}->{$estadoNuevo}") {
            case 'borrador->revision':
                transicionValida=inarray(rol, ['admin', 'gestion']);
                break;

            case 'borrador->archivado':
                transicionValida=(rol === 'admin');
                break;

            case 'revision->aprobado':
                if (in_array($rol, ['admin', 'revision'])) {
                    // Regla de integridad: un convenio bilateral necesita mínimo 2 instituciones firmantes y 0 observaciones abiertas.
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
                    // Regla de trazabilidad: no se puede rechazar a borrador sin dejar asentada al menos 1 observación que explique qué corregir.
                    $obsPendientes = $existente->observaciones->where('esta_resuelta', false)->count();
                    if ($obsPendientes === 0) {
                        return $this->error('Para devolver a borrador debe registrar al menos una observación sin resolver', 422);
                    }
                    $transicionValida = true;
                }
                break;

            case 'aprobado->firmado':
                transicionValida=inarray(rol, ['admin', 'gestion']);
                break;

            // Transiciones extraordinarias de cierre o reversión: exclusivas del administrador.
            case 'aprobado->borrador':
            case 'firmado->rescindido':
            case 'firmado->archivado':
            case 'rescindido->archivado':
                transicionValida=(rol === 'admin');
                break;
        }



        if (!$transicionValida) {
            return $this->error("Transición de estado de '{$estadoActual}' a '{$estadoNuevo}' no permitida para su rol", 422);
        }

        $conflicto = false;
// Transacción atómica con control de concurrencia: actualiza estado + incrementa versión + graba log inmutable en `transiciones_estado
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
     * Exportación CSV por streaming con protección contra Formula/CSV Injection.
     */

    public function exportCsv(Request $request)
    {
        $user = $request->user();
        // Reutiliza visiblePara($user) y los mismos filtros de index() para que el usuario exporte exactamente lo que tiene permiso de ver.
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

         // Cabeceras HTTP que fuerzan al navegador a descargar el flujo como archivo adjunto CSV UTF-8.
        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        /*
         * Closure de sanitización contra CSV Injection (OWASP):
         * Si una celda empieza con '=', '+', '-', '@', tabulador o retorno de carro, Excel/LibreOffice intentaría ejecutarla
         * como fórmula o comando DDE. Anteponer una comilla simple (') fuerza a la hoja de cálculo a tratarla como texto literal.
         */
        sanitizar=function(valor) {
            str=(string)(valor ?? '');
            if (str!==''&&inarray(str[0], ['=', '+', '-', '@', "\t", "\r"])) {
                return "'" . $str;
            }
            return $str;
        };



        /*
         * Callback para response()->stream():
         * - fopen('php://output', 'w'): Abre el buffer de salida HTTP directamente como un archivo escribible.
         * - fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF)): Escribe el Byte Order Mark (BOM) UTF-8 para que Excel muestre tildes y 'ñ' sin romper caracteres.
         * - fputcsv(..., ';'): Función nativa de PHP que formatea cada fila separada por punto y coma (estándar regional para Excel en español) y escapa comillas internas.
         */

        $callback = function () use ($convenios, $sanitizar) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($file, ['Código', 'Título', 'Tipo', 'Estado', 'Unidad Académica', 'Fecha Inicio', 'Fecha Fin'], ';');

            foreach ($convenios as $c) {
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
     * Carga la ficha completa de un convenio con todas sus relaciones y aplica censura de datos personales según rol.
     * Invocada por store(), show(), update() y transition().
     */
    private function cargarFicha($id, $user)
    {
        // Eager loading anidado (ej. 'detallePasantia.estudiante', 'vinculosOrigen.destino') definido en app/Models/Convenio.php y modelos hijos.
        convenio=Convenio::visiblePara(user)->with([
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

        /*
         * Privacidad de datos personales (PII):
         * Si el rol es 'consulta', ->makeHidden(['dni', 'email', 'telefono']) oculta en tiempo de ejecución esas columnas
         * de los modelos Persona antes de que Laravel los serialice a JSON.
         * El operador `?->` (Nullsafe operator de PHP 8) evita errores si algún tutor es null.
         */
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

    /**
     * Sincroniza la tabla pivote N:M `partes_convenio`.
     */
    private function sincronizarPartes(Convenio $convenio, ?array $partes): void
    {
        if ($partes === null) {
            return;
        }

        // Arma el formato asociativo requerido por Eloquent sync(): [ parte_id => ['rol_en_convenio' => '...'], ... ]
        $sync = [];
        foreach ($partes as $p) {
            parteId=isarray(p) ? ($p['parte_id'] ?? $p['id'] ?? null) : $p;
            rol=isarray(p) ? ($p['rol_en_convenio'] ?? $p['rol'] ?? null) : null;
            if ($parteId) {
                sync[parteId] = ['rol_en_convenio' => $rol];
            }
        }

        // convenio->partes()->sync(sync): Método nativo de BelongsToMany (app/Models/Convenio.php).
        // Inserta nuevos IDs, actualiza columnas pivote existentes y elimina de `partes_convenio` los que ya no vengan en $sync.
        convenio->partes()->sync(sync);
    }

    /**
     * Sincroniza la tabla pivote N:M `personas_convenio`.
     */
    private function sincronizarPersonas(Convenio $convenio, ?array $personas): void
    {
        if ($personas === null) {
            return;
        }

        $sync = [];
        foreach ($personas as $p) {
            personaId=isarray(p) ? ($p['persona_id'] ?? $p['id'] ?? null) : $p;
            rol=isarray(p) ? ($p['rol'] ?? 'Sin especificar') : 'Sin especificar';
            if ($personaId) {
                sync[personaId] = ['rol' => $rol];
            }
        }

        convenio->personas()->sync(sync);
    }

    /**
     * Crea o actualiza la fila 1:1 en `detalles_pasantia` cuando el convenio es de tipo 'pasantia'.
     */
    private function guardarDetallePasantia(Convenio $convenio, array $dp): void
    {
        // DetallePasantia::updateOrCreate(array $busqueda, array $valores):
        // Método nativo de Eloquent: busca por 'convenio_id'; si existe hace UPDATE, si no existe hace INSERT.
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
