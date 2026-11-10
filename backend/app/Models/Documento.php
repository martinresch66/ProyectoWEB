<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Documento extends Model
{
    use HasFactory;

    protected $table = 'documentos';
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = null;

    protected $fillable = [
        'convenio_id',
        'tipo_documento',
        'nombre_original',
        'ruta_archivo',
        'tamano_bytes',
        'tipo_mime',
        'hash_sha256',
        'version',
        'subido_por',
    ];
}