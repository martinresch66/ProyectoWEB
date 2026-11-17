<?php

namespace App\Http\Controllers;

use Illuminate\Pagination\LengthAwarePaginator;

abstract class Controller
{
    /**
     * Respuesta exitosa estandarizada
     */
    protected function success($data = null, string$message = 'Operación realizada con éxito', int $code = 200)
    {
        // Si es una paginación de Laravel ($query->paginate), mantenemos data en el nivel raíz para Next.js
        if ($data instanceof LengthAwarePaginator) {$responseData = $data->toArray();$responseData['success'] = true;
            $responseData['message'] =$message;

            return response()->json($responseData,$code);
        }

        // Si es un objeto, array simple o registro individual
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $code);
    }

    /**
     * Respuesta de error estandarizada
     */
    protected function error(string $message = 'Ocurrió un error', int $code = 400,$errors = null)
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors'  => $errors,
        ], $code);
    }
}