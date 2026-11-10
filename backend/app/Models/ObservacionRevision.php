<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ObservacionRevision extends Model
{
    use HasFactory;

    protected $table = 'observaciones_revision';
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = null;

    protected $fillable = [
        'convenio_id',
        'observacion',
        'esta_resuelta',
        'respuesta',
        'usuario_revisor_id',
    ];

    protected $casts = [
        'esta_resuelta' => 'boolean',
    ];

    public function convenio()
    {
        return $this->belongsTo(Convenio::class, 'convenio_id');
    }

    public function revisor()
    {
        return $this->belongsTo(User::class, 'usuario_revisor_id');
    }
}