<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Unidad extends Model
{
    use HasFactory;

    protected $table = 'unidades';
    public $timestamps = false;

    protected $fillable = [
        'nombre',
        'sigla',
        'codigo',
    ];

    public function convenios()
    {
        return $this->hasMany(Convenio::class, 'unidad_id');
    }
}