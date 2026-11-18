<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    /**
     * GET /api/alerts
     * * Lista las notificaciones personales del usuario autenticado.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        /*
         * Aislamiento estricto por dueño (`where('usuario_id', $user->id)`):
         * - No usa `Convenio::visiblePara()` porque una notificación es privada de cada usuario destinatario
         */
        $alertas = Alert::where('usuario_id', $user->id)
            ->orderByDesc('id')
            ->get();

        return response()->json($alertas);
    }

    /**
     * PATCH /api/alerts/{id}
     * * Marca una notificación como leída (o no leída) validando que pertenezca al usuario actual.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        /*
         * Prevención de vulnerabilidad IDOR (Insecure Direct Object Reference):
         * - En lugar de hacer `Alert::find($id)` (que permitiría que un usuario cambie el ID en la URL
         *   para marcar como leídas las alertas de otro compañero), encadena `where('usuario_id', $user->id)->find($id)`.
         * - Si la alerta no existe O pertenece a otro usuario, devuelve `404 Not Found`.
         */
        $alerta = Alert::where('usuario_id', $user->id)->find($id);

        if (!$alerta) {
            return response()->json(['message' => 'Alerta no encontrada'], 404);
        }

        $request->validate([
            'leida' => 'required|boolean',
        ]);

        // Asigna el booleano normalizado y ejecuta el `UPDATE notificaciones SET leida = ? WHERE id = ?`.
        $alerta->leida = $request->boolean('leida');
        $alerta->save();

        return response()->json($alerta);
    }
}