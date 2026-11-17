<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Convenio;
use App\Models\Documento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentoController extends Controller
{
    /**
     * POST /api/agreements/{id}/documents
     */
    public function store(Request $request, $id)
    {
        $user = $request->user();

        // Validar que el convenio existe y está dentro del alcance del usuario
        $convenio = Convenio::visiblePara($user)->find($id);

        if (!$convenio) {
            return response()->json(['message' => 'Convenio no encontrado'], 404);
        }

        // Permisos: admin, gestion (de su unidad) o revision
        if (!in_array($user->rol, ['admin', 'gestion', 'revision'])) {
            return response()->json(['message' => 'No tiene permisos para subir documentos'], 403);
        }

        if ($user->rol === 'gestion' && (int)$convenio->unidad_id !== (int)$user->unidad_id) {
            return response()->json(['message' => 'No tiene permisos para modificar este convenio'], 403);
        }

        $request->validate([
            'archivo'        => 'required|file|mimes:pdf|max:20480', // Máximo 20 MB
            'tipo_documento' => 'required|string|in:convenio_firmado,anexo,dictamen,resolucion,acta_pasantia,otro',
        ]);

        $file = $request->file('archivo');
        $hashSha256 = hash_file('sha256', $file->getRealPath());

        // Evitar archivos duplicados en el mismo convenio
        $duplicado = Documento::where('convenio_id', $convenio->id)
            ->where('hash_sha256', $hashSha256)
            ->first();

        if ($duplicado) {
            return response()->json([
                'message' => 'Este documento ya fue subido previamente a este convenio.'
            ], 422);
        }

        // Calcular la versión correlativa por tipo de documento
        $ultimaVersion = Documento::where('convenio_id', $convenio->id)
            ->where('tipo_documento', $request->tipo_documento)
            ->max('version') ?? 0;

        $version = $ultimaVersion + 1;

        // Guardar físicamente fuera del directorio public/
        $path = $file->store('documentos/' . date('Y/m'));

        $documento = Documento::create([
            'convenio_id'     => $convenio->id,
            'tipo_documento'  => $request->tipo_documento,
            'nombre_original' => $file->getClientOriginalName(),
            'ruta_archivo'    => $path,
            'tamano_bytes'    => $file->getSize(),
            'tipo_mime'       => $file->getClientMimeType(),
            'hash_sha256'     => $hashSha256,
            'version'         => $version,
            'subido_por'      => $user->id,
        ]);

        return response()->json($documento->load('usuario:id,nombre'), 201);
    }

    /**
     * GET /api/documents/{id}/download
     */
    public function download(Request $request, $id)
    {
        $user = $request->user();
        
        $documento = Documento::find($id);

        if (!$documento) {
            return response()->json(['message' => 'Documento no encontrado'], 404);
        }

        // Verificar alcance sobre el convenio dueño del documento
        $convenio = Convenio::visiblePara($user)->find($documento->convenio_id);

        if (!$convenio) {
            return response()->json(['message' => 'No tiene permisos para ver este documento'], 403);
        }

        if (!Storage::exists($documento->ruta_archivo)) {
            return response()->json(['message' => 'El archivo físico no fue encontrado en el servidor'], 404);
        }

        return Storage::download($documento->ruta_archivo, $documento->nombre_original);
    }
}