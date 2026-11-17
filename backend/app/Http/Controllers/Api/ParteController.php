<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Parte;
use Illuminate\Http\Request;

class ParteController extends Controller
{
    /**
     * GET /api/parties
     */
    public function index(Request $request)
    {
        $query = Parte::query();

        if ($request->filled('q')) {
            $q = $request->input('q');
            $query->where(function ($sub) use ($q) {
                $sub->where('nombre', 'like', "%{$q}%")
                    ->orWhere('cuit_cuil', 'like', "%{$q}%");
            });
        }

        $perPage = $request->input('per_page', 100);

        return $this->success($query->paginate($perPage), 'Lista de partes obtenida correctamente');
    }

    /**
     * POST /api/parties
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre'          => 'required|string|max:255',
            'cuit_cuil'       => 'required|string|unique:partes,cuit_cuil|regex:/^\d{2}-\d{8}-\d{1}$/',
            'tipo_personeria' => 'nullable|string|in:fisica,juridica',
            'email'           => 'nullable|email|max:255',
            'telefono'        => 'nullable|string|max:50',
            'direccion'       => 'nullable|string|max:255',
        ]);

        $parte = Parte::create($validated);

        return $this->success($parte, 'Parte registrada exitosamente', 201);
    }
}