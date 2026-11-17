<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use OpenApi\Attributes as OA;

class AuthController extends Controller
{
    #[OA\Post(
        path: "/auth/login",
        summary: "Iniciar sesión",
        tags: ["Autenticación"]
    )]
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->clave)) {
            return $this->error('Credenciales inválidas', 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->success([
            'token' => $token,
            'user'  => [
                'id'        => $user->id,
                'nombre'    => $user->nombre,
                'email'     => $user->email,
                'rol'       => $user->rol,
                'unidad_id' => $user->unidad_id,
            ]
        ], 'Inicio de sesión exitoso');
    }

    #[OA\Get(
        path: "/auth/me",
        summary: "Obtener usuario autenticado",
        tags: ["Autenticación"]
    )]
    public function me(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return $this->error('Usuario no autenticado', 401);
        }

        return $this->success([
            'id'        => $user->id,
            'nombre'    => $user->nombre,
            'name'      => $user->nombre,
            'email'     => $user->email,
            'rol'       => $user->rol,
            'unidad_id' => $user->unidad_id,
        ], 'Datos del usuario autenticado');
    }

    #[OA\Post(
        path: "/auth/logout",
        summary: "Cerrar sesión",
        tags: ["Autenticación"]
    )]
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(null, 'Sesión cerrada correctamente');
    }
}