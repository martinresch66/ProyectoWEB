<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConvenioController;
use App\Http\Controllers\Api\UnidadController;
use App\Http\Controllers\Api\AlertController;

// Rutas Públicas
Route::post('/auth/login', [AuthController::class, 'login']);

// Rutas Protegidas por Sanctum
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Endpoints estándar requeridos por el CONTRATO-API.md
    Route::apiResource('agreements', ConvenioController::class);
    Route::get('/units', [UnidadController::class, 'index']);
    Route::get('/alerts', [AlertController::class, 'index']);
});