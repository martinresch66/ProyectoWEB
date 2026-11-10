<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    /**
     * GET /api/alerts
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $alertas = Alert::where('user_id', $user->id)
            ->orderByDesc('id')
            ->get();

        return response()->json($alertas);
    }

    /**
     * PATCH /api/alerts/{id}
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        $alerta = Alert::where('user_id', $user->id)->find($id);

        if (!$alerta) {
            return response()->json(['message' => 'Alerta no encontrada'], 404);
        }

        $request->validate([
            'leida' => 'required|boolean',
        ]);

        $alerta->leida = $request->boolean('leida');
        $alerta->save();

        return response()->json($alerta);
    }
}