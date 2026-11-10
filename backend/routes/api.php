<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConvenioController;
use App\Http\Controllers\Api\UnidadController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\ParteController;
use App\Http\Controllers\Api\PersonaController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VinculoController;
use App\Http\Controllers\Api\DocumentoController;
use App\Http\Controllers\Api\ObservacionController;
use App\Http\Controllers\Api\DashboardController;

// Rutas Públicas
Route::post('/auth/login', [AuthController::class, 'login']);

// Rutas Protegidas por Sanctum
Route::middleware('auth:sanctum')->group(function () {
    // Autenticación y Sesión
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Convenios
    Route::get('/agreements/export', [ConvenioController::class, 'exportCsv']);
    Route::apiResource('agreements', ConvenioController::class)->only(['index', 'show', 'store', 'update']);
    Route::post('/agreements/{id}/transitions', [ConvenioController::class, 'transition']);
    // Vínculos entre convenios (Adendas / Específicos)
    Route::post('/agreements/{id}/links', [VinculoController::class, 'store']);
    Route::delete('/agreements/{id}/links/{vinculoId}', [VinculoController::class, 'destroy']);

    // Documentos PDF
   Route::post('/agreements/{id}/documents', [DocumentoController::class, 'store']);
   Route::get('/documents/{id}/download', [DocumentoController::class, 'download']);

   // Observaciones de Revisión
    Route::post('/agreements/{id}/observations', [ObservacionController::class, 'store']);
    Route::patch('/observations/{id}', [ObservacionController::class, 'update']);
    
    // Catálogos: Unidades, Partes, Personas
    Route::get('/units', [UnidadController::class, 'index']);

    Route::get('/parties', [ParteController::class, 'index']);
    Route::post('/parties', [ParteController::class, 'store']);

    Route::get('/people', [PersonaController::class, 'index']);
    Route::post('/people', [PersonaController::class, 'store']);

    // Módulo de Usuarios
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
   // Route::put('/users/{id}', [UserController::class, 'update']);

    // Dashboard y Alertas
    //Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/alerts', [AlertController::class, 'index']);
    //Route::patch('/alerts/{id}', [AlertController::class, 'update']);
});