<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VinculoConvenio extends Model
{
    use HasFactory;

    protected $table = 'vinculos_convenio';

    public $timestamps = false; // Usa creado_en según el schema de la BD

    protected $fillable = [
        'convenio_origen_id',
        'convenio_destino_id',
        'tipo_vinculo',
        'creado_en',
    ];

    public function origen()
    {
        return $this->belongsTo(Convenio::class, 'convenio_origen_id');
    }

    public function destino()
    {
        return $this->belongsTo(Convenio::class, 'convenio_destino_id');
    }
}