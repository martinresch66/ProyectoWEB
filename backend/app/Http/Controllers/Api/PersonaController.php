<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Persona;
use Illuminate\Http\Request;

class PersonaController extends Controller
{
    /**
     * GET /api/people
     */
    public function index(Request $request)
    {
        $query = Persona::query();

        if ($request->filled('q')) {
            $q = $request->input('q');
            $query->where(function ($sub) use ($q) {
                $sub->where('nombre', 'like', "%{$q}%")
                    ->orWhere('apellido', 'like', "%{$q}%")
                    ->orWhere('dni', 'like', "%{$q}%");
            });
        }

        $perPage = $request->input('per_page', 100);
        $personas = $query->paginate($perPage);

        // Ocultar DNI para roles de consulta según Contrato API
        $user = $request->user();
        if ($user && !in_array($user->rol, ['admin', 'gestion'])) {
            $personas->getCollection()->transform(function ($persona) {
                $persona->dni = '***' . substr($persona->dni, -3);
                return $persona;
            });
        }

        return $this->success($personas, 'Lista de personas obtenida correctamente');
    }

    /**
     * POST /api/people
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre'   => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'dni'      => 'required|string|unique:personas,dni|max:50',
            'email'    => 'nullable|email|max:255',
            'telefono' => 'nullable|string|max:100',
        ]);

        $persona = Persona::create($validated);

        return $this->success($persona, 'Persona registrada exitosamente', 201);
    }
}