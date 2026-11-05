<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use OpenApi\Attributes as OA;

class AuthController extends Controller
{
    #[OA\Post(
        path: "/auth/login",
        summary: "Iniciar sesión",
        description: "Autentica al usuario y devuelve un token de Sanctum",
        tags: ["Autenticación"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["email", "password"],
                properties: [
                    new OA\Property(property: "email", type: "string", format: "email", example: "admin@unlpam.edu.ar"),
                    new OA\Property(property: "password", type: "string", format: "password", example: "secreto123")
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: "Login exitoso",
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: "token", type: "string", example: "1|LaravelSanctumTokenHash..."),
                        new OA\Property(property: "user", type: "object")
                    ]
                )
            ),
            new OA\Response(response: 401, description: "Credenciales inválidas")
        ]
    )]
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // 1. Buscar al usuario en la tabla 'usuarios' por su email
        $user = User::where('email', $request->email)->first();

        // 2. Verificar que el usuario exista y que el hash en 'clave' coincida
        if (!$user || !Hash::check($request->password, $user->clave)) {
            return response()->json(['message' => 'Credenciales inválidas'], 401);
        }

        // 3. Crear el token de Sanctum
        $token = $user->createToken('auth_token')->plainTextToken;

        // 4. Retornar la respuesta exitosa
        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'nombre' => $user->nombre,
                'email' => $user->email,
                'rol' => $user->rol,
                'unidad_id' => $user->unidad_id,
            ]
        ]);
    }

    #[OA\Get(
        path: "/auth/me",
        summary: "Obtener usuario autenticado",
        tags: ["Autenticación"],
        security: [["bearerAuth" => []]],
        responses: [
            new OA\Response(response: 200, description: "Datos del usuario obtenidos con éxito"),
            new OA\Response(response: 401, description: "No autorizado")
        ]
    )]
    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    #[OA\Post(
        path: "/auth/logout",
        summary: "Cerrar sesión",
        tags: ["Autenticación"],
        security: [["bearerAuth" => []]],
        responses: [
            new OA\Response(response: 200, description: "Sesión cerrada correctamente"),
            new OA\Response(response: 401, description: "No autorizado")
        ]
    )]
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada correctamente'], 200);
    }
}