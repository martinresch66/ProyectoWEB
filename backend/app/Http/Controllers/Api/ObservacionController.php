<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Convenio;
use App\Models\ObservacionRevision;
use Illuminate\Http\Request;

class ObservacionController extends Controller
{
    /**
     * POST /api/agreements/{id}/observations
     * * Crea una observación nueva (un señalamiento o corrección pedida sobre un convenio).
     */
    public function store(Request $request, $id)
    {
        $user = $request->user();

        /*
         * Control de rol (RBAC):
         * - Únicamente `admin` y `revision` pueden abrir observaciones nuevas.
         * - Un gestor (`gestion`) NO puede auto-crearse observaciones; su rol es responderlas y corregir el convenio.
         */
        if (!in_array($user->rol, ['admin', 'revision'])) {
            return response()->json(['message' => 'No tiene permisos para agregar observaciones'], 403);
        }
    //Verifica que el convenio exista y esté dentro del alcance del usuario (scopeVisiblePara en Convenio.php).
        $convenio = Convenio::visiblePara($user)->find($id);

        if (!$convenio) {
            return response()->json(['message' => 'Convenio no encontrado'], 404);
        }
        // Validación: exige texto no vacío de al menos 5 caracteres
        $request->validate([
            'observacion' => 'required|string|min:5',
        ]);

        /*
         * Creación del registro:
         * - `esta_resuelta` nace siempre en `false`.
         * - CONEXIÓN CON EL FLUJO DE ESTADOS: Mientras exista al menos 1 fila con `esta_resuelta = false` en este convenio,
         *   `ConvenioController::transition()` bloquea el paso `revision -> aprobado` (HTTP 422), y al mismo tiempo
         *   habilita el paso `revision -> borrador` (que exige tener al menos 1 observación abierta para devolverlo).
         */
        $observacion = ObservacionRevision::create([
            'convenio_id'        => $convenio->id,
            'observacion'        => $request->input('observacion'),
            'esta_resuelta'      => false,
            'usuario_revisor_id' => $user->id,
        ]);

        return response()->json($observacion->load('revisor:id,nombre'), 201);
    }

    /**
     * PATCH /api/observations/{id}
     * * Permite a gestión responder la observación y a revisión/admin marcarla como resuelta.
     * Se usa PATCH (y no PUT) porque es una actualización parcial de uno o dos campos.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->rol, ['admin', 'revision', 'gestion'])) {
            return response()->json(['message' => 'No tiene permisos para actualizar observaciones'], 403);
        }

        $observacion = ObservacionRevision::with('convenio')->find($id);

        if (!$observacion) {
            return response()->json(['message' => 'Observación no encontrada'], 404);
        }

        $request->validate([
            'esta_resuelta' => 'sometimes|boolean',
            'respuesta'     => 'nullable|string',
        ]);

        if ($request->has('esta_resuelta')) {
            $observacion->esta_resuelta = $request->boolean('esta_resuelta');
        }

        if ($request->filled('respuesta')) {
            $observacion->respuesta = $request->input('respuesta');
        }

        // Ejecuta el UPDATE en MySQL sobre `observaciones_revision`.
        $observacion->save();

        return response()->json($observacion->load('revisor:id,nombre'));
    }
}