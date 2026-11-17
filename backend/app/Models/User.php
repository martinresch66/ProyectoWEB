<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'usuarios';

    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    protected $fillable = [
        'nombre',
        'email',
        'clave',
        'rol',
        'unidad_id',
        'activo',
    ];

    protected $hidden = [
        'clave',
        'remember_token',
    ];

    public function getAuthPasswordName()
    {
        return 'clave';
    }

    public function getAuthPassword()
    {
        return $this->clave;
    }

    public function unidad()
    {
        return $this->belongsTo(Unidad::class, 'unidad_id');
    }
}