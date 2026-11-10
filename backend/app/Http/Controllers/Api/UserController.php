<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * GET /api/users
     */
    public function index(Request $request)
    {
        $query = User::with('unidad');

        if ($request->filled('q')) {
            $q = $request->input('q');
            $query->where(function ($sub) use ($q) {
                $sub->where('nombre', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        $perPage = $request->input('per_page', 100);
        $users = $query->paginate($perPage);

        // Agregamos la propiedad 'name' para que la vista renderice la columna sin fallar
        $users->getCollection()->transform(function ($user) {
            $user->name = $user->nombre;
            return $user;
        });

        return $this->success($users, 'Lista de usuarios obtenida correctamente');
    }

    /**
     * POST /api/users
     */
    public function store(Request $request)
    {
        // 1. Si el front envió 'nombre' en vez de 'name', lo unificamos
        if (!$request->has('name') && $request->has('nombre')) {
            $request->merge(['name' => $request->input('nombre')]);
        }

        // 2. Validación según Contrato API
        $validated = $request->validate([
            'name'      => 'required|string|max:255',
            'email'     => 'required|email|unique:usuarios,email',
            'password'  => 'required|string|min:6',
            'rol'       => 'required|string|in:admin,gestion,revision,consulta',
            'unidad_id' => 'nullable|exists:unidades,id',
        ]);

        // 3. Creación en la tabla real de MySQL ('usuarios')
        $user = User::create([
            'nombre'    => $validated['name'],
            'email'     => $validated['email'],
            'clave'     => Hash::make($validated['password']),
            'rol'       => $validated['rol'],
            'unidad_id' => $validated['unidad_id'] ?? null,
            'activo'    => 1,
        ]);

        $user->load('unidad');
        $user->name = $user->nombre;

        return $this->success($user, 'Usuario creado exitosamente', 201);
    }
}