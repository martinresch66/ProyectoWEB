<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use OpenApi\Attributes as OA;

#[OA\Info(
    version: "1.0.0",
    title: "API Convenios UNLPam",
    description: "Documentación interactiva de la API REST para el Sistema de Gestión de Convenios UNLPam"
)]
#[OA\Server(
    url: "http://127.0.0.1:8000/api/v1",
    description: "Servidor Local de Desarrollo"
)]
#[OA\SecurityScheme(
    securityScheme: "bearerAuth",
    type: "http",
    name: "Authorization",
    in: "header",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Ingrese el token devuelto al iniciar sesión"
)]
class SwaggerController extends Controller
{
    #[OA\Get(
        path: "/ping",
        summary: "Verificar estado de la API",
        tags: ["Estado"],
        responses: [
            new OA\Response(
                response: 200,
                description: "API activa y respondiendo correctamente"
            )
        ]
    )]
    public function ping()
    {
        return response()->json(['status' => 'ok', 'message' => 'API Convenios UNLPam activa']);
    }
}