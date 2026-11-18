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
     * POST /api/agreements/{id}/documents\
     * Sube un PDF adjunto, verifica integridad/duplicados por SHA-256, versiona y guarda fuera de public/
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

        /*
         *   Validación estricta del archivo entrante ($request->validate):
         * - `file`: Verifica que sea un archivo subido correctamente vía multipart/form-data sin errores de PHP.
         * - `mimes:pdf`: No confía solo en la extensión `.pdf` del nombre; Laravel inspecciona los "Magic Bytes" (firma binaria
         *   interna `%PDF-`) del archivo real mediante Symfony MimeTypes para impedir que suban un `.exe` o `.php` renombrado.
         * - `max:20480`: El tamaño máximo en Laravel se expresa en Kilobytes (20480 KB = 20 MB).
         * - `tipo_documento`: Lista cerrada de categorías documentales aceptadas.
         */
        $request->validate([
            'archivo'        => 'required|file|mimes:pdf|max:20480', // Máximo 20 MB
            'tipo_documento' => 'required|string|in:convenio_firmado,anexo,dictamen,resolucion,acta_pasantia,otro',
        ]);


        /*
         *    calculo de huella criptográfica SHA-256 y detección de duplicados:
         * - `$request->file('archivo')`: Devuelve una instancia de `Illuminate\Http\UploadedFile(UploadedFile es la representación orientada a objetos de Laravel para un archivo recién subido, que te da métodos seguros para inspeccionarlo, validarlo y moverlo al almacenamiento definitivo.)`.
         * - `$file->getRealPath()`: Obtiene la ruta temporal en el servidor (ej. `/tmp/phpXXXXXX`) donde PHP alojó el upload.
         * - `hash_file('sha256', ...)`: Función nativa de PHP que lee los bytes reales del PDF y genera un resumen hexadecimal único de 64 caracteres.
         * - POR QUÉ SE HACE ASÍ: Dos archivos idénticos (aunque uno se llame `final.pdf` y otro `copia_final(2).pdf`) producen exactamente
         *   el mismo SHA-256. Con esa consulta evita almacenar archivos duplicados dentro del mismo convenio (`422 Unprocessable Entity`).
         */
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
        // Guardar físicamente fuera del directorio public/(unico directorio que no esta aislado de internet) para evitar quq alguien intente adivinar
        //  la URL directa tipo `http://servidor/documentos/archivo.pdf`;
        //la única vía de descarga es pasar por el endpoint autenticado `download()` que valida token, rol y facultad.
        $path = $file->store('documentos/' . date('Y/m'));

        // Persiste los metadatos en MySQL
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
     *descarga controlada del PDF verificando permisos sobre el convenio padre.
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

        // Verifica que el archivo físico siga existiendo en `storage/app/...` antes de intentar enviarlo.
        if (!Storage::exists($documento->ruta_archivo)) {
            return response()->json(['message' => 'El archivo físico no fue encontrado en el servidor'], 404);
        }

        /*
         * `Storage::download($ruta, $nombreDescarga)`:
         * - Método del Facade `Storage` (Illuminate\Support\Facades\Storage).
         * - Lee el archivo privado desde `storage/app/...` y genera una `StreamedResponse` con las cabeceras HTTP
         *   `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="<nombre_original>"`,
         *   devolviéndole al usuario el archivo con su nombre legible original en lugar del hash interno del servidor.
         */
        return Storage::download($documento->ruta_archivo, $documento->nombre_original);
    }
}