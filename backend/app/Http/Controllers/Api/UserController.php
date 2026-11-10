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
        $user = $request->user();

        if ($user->rol !== 'admin') {
            return response()->json(['message' => 'No tiene permisos para ver usuarios'], 403);
        }

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

        // Mapear 'name' por compatibilidad con el frontend
        $users->getCollection()->transform(function ($u) {
            $u->name = $u->nombre;
            return $u;
        });

        return $this->success($users, 'Lista de usuarios obtenida correctamente');
    }

    /**
     * POST /api/users
     */
    public function store(Request $request)
    {
        if ($request->user()->rol !== 'admin') {
            return response()->json(['message' => 'No tiene permisos para crear usuarios'], 403);
        }

        if (!$request->has('name') && $request->has('nombre')) {
            $request->merge(['name' => $request->input('nombre')]);
        }

        $validated = $request->validate([
            'name'      => 'required|string|max:255',
            'email'     => 'required|email|unique:usuarios,email',
            'password'  => 'required|string|min:6',
            'rol'       => 'required|string|in:admin,gestion,revision,consulta',
            'unidad_id' => 'nullable|exists:unidades,id',
            'activo'    => 'nullable|boolean',
        ]);

        $user = User::create([
            'nombre'    => $validated['name'],
            'email'     => $validated['email'],
            'clave'     => Hash::make($validated['password']),
            'rol'       => $validated['rol'],
            'unidad_id' => $validated['unidad_id'] ?? null,
            'activo'    => $validated['activo'] ?? 1,
        ]);

        $user->load('unidad');
        $user->name = $user->nombre;

        return $this->success($user, 'Usuario creado exitosamente', 201);
    }

    /**
     * PUT /api/users/{id}
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        if ($user->rol !== 'admin') {
            return response()->json(['message' => 'No tiene permisos para editar usuarios'], 403);
        }

        $usuario = User::find($id);

        if (!$usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        // Si el front mandó 'name', lo unificamos a 'nombre'
        if ($request->has('name') && !$request->has('nombre')) {
            $request->merge(['nombre' => $request->input('name')]);
        }

        $validated = $request->validate([
            'nombre'    => 'sometimes|string|max:255',
            'email'     => 'sometimes|email|unique:usuarios,email,' . $id, // <-- Corregido de users a usuarios
            'password'  => 'nullable|string|min:6',
            'rol'       => 'sometimes|string|in:admin,gestion,revision,consulta',
            'unidad_id' => 'nullable|exists:unidades,id',
            'activo'    => 'sometimes|boolean',
        ]);

        // Mapear campos de la base de datos MySQL real ('usuarios')
        if (array_key_exists('nombre', $validated)) {
            $usuario->nombre = $validated['nombre'];
        }

        if (array_key_exists('email', $validated)) {
            $usuario->email = $validated['email'];
        }

        if (!empty($validated['password'])) {
            $usuario->clave = Hash::make($validated['password']);
        }

        if (array_key_exists('rol', $validated)) {
            $usuario->rol = $validated['rol'];
        }

        if (array_key_exists('unidad_id', $validated)) {
            $usuario->unidad_id = $validated['unidad_id'];
        }

        if (array_key_exists('activo', $validated)) {
            $usuario->activo = $validated['activo'] ? 1 : 0;
        }

        $usuario->save();

        $usuario->load('unidad');
        $usuario->name = $usuario->nombre;

        return response()->json([
            'success' => true,
            'message' => 'Usuario actualizado correctamente',
            'data'    => $usuario,
        ]);
    }
}