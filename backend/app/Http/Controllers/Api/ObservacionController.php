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
     */
    public function store(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->rol, ['admin', 'revision'])) {
            return response()->json(['message' => 'No tiene permisos para agregar observaciones'], 403);
        }

        $convenio = Convenio::visiblePara($user)->find($id);

        if (!$convenio) {
            return response()->json(['message' => 'Convenio no encontrado'], 404);
        }

        $request->validate([
            'observacion' => 'required|string|min:5',
        ]);

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

        $observacion->save();

        return response()->json($observacion->load('revisor:id,nombre'));
    }
}