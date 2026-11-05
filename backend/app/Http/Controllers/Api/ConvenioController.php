<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Convenio;
use Illuminate\Http\Request;

class ConvenioController extends Controller
{
    /**
     * Muestra una lista de todos los convenios.
     * Corresponde a la petición: GET /api/convenios
     */
    public function index()
    {
        // Consultamos los convenios trayendo también los datos de la unidad y del creador
        $convenios = Convenio::with(['unidad', 'creador'])->get();

        // Devolvemos la respuesta en formato JSON con un código de estado 200 OK
        return response()->json($convenios, 200);
    }

    /**
     * Guarda un nuevo convenio en la base de datos.
     * Corresponde a la petición: POST /api/convenios
     */
    public function store(Request $request)
    {
        // 1. Validamos que los datos obligatorios vengan en la petición HTTP
        $validatedData = $request->validate([
            'codigo' => 'required|string|unique:convenios,codigo',
            'titulo' => 'required|string|max:255',
            'tipo' => 'required|string',
            'estado' => 'required|string',
            'unidad_id' => 'required|exists:unidades,id',
            'resumen' => 'nullable|string',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => 'nullable|date',
            'dias_preaviso' => 'nullable|integer',
        ]);

        // 2. Le asignamos el ID del usuario autenticado que realiza la carga
        $validatedData['creado_por'] = $request->user()->id;

        // 3. Creamos el registro en MySQL mediante Eloquent
        $convenio = Convenio::create($validatedData);

        // Devolvemos el convenio recién creado con estado 201 Created
        return response()->json($convenio, 201);
    }

    /**
     * Muestra un convenio específico por su ID.
     * Corresponde a la petición: GET /api/convenios/{id}
     */
    public function show($id)
    {
        // Busca el convenio por ID o arroja una excepción 404 Not Found automáticamente si no existe
        $convenio = Convenio::with(['unidad', 'creador'])->findOrFail($id);

        return response()->json($convenio, 200);
    }

    /**
     * Actualiza un convenio existente.
     * Corresponde a la petición: PUT/PATCH /api/convenios/{id}
     */
    public function update(Request $request, $id)
    {
        $convenio = Convenio::findOrFail($id);

        $validatedData = $request->validate([
            'codigo' => 'sometimes|string|unique:convenios,codigo,' . $id,
            'titulo' => 'sometimes|string|max:255',
            'tipo' => 'sometimes|string',
            'estado' => 'sometimes|string',
            'unidad_id' => 'sometimes|exists:unidades,id',
            'resumen' => 'nullable|string',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => 'nullable|date',
            'dias_preaviso' => 'nullable|integer',
        ]);

        // Actualizamos los campos en MySQL
        $convenio->update($validatedData);

        return response()->json($convenio, 200);
    }

    /**
     * Elimina un convenio de la base de datos.
     * Corresponde a la petición: DELETE /api/convenios/{id}
     */
    public function destroy($id)
    {
        $convenio = Convenio::findOrFail($id);
        $convenio->delete();

        return response()->json(['message' => 'Convenio eliminado correctamente'], 200);
    }
}