<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Persona extends Model
{
    use HasFactory;

    protected $table = 'personas';

    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    protected $fillable = [
        'nombre',
        'apellido',
        'dni',
        'email',
        'telefono',
    ];

    public function convenios()
    {
        return $this->belongsToMany(Convenio::class, 'personas_convenio', 'persona_id', 'convenio_id')
                    ->withPivot('rol');
    }
}