<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Parte extends Model
{
    use HasFactory;

    protected $table = 'partes';

    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    protected $fillable = [
        'nombre',
        'cuit_cuil',
        'tipo_personeria',
        'email',
        'telefono',
        'direccion',
    ];

    public function convenios()
    {
        return $this->belongsToMany(Convenio::class, 'partes_convenio', 'parte_id', 'convenio_id')
                    ->withPivot('rol_en_convenio');
    }
}