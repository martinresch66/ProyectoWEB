import { useState } from 'react';

import { IconButton } from '../atoms';
import { FormField, type FormFieldProps } from './FormField';

/** Molécula: FormField de contraseña con botón para mostrar/ocultar lo escrito. */
export function PasswordField(props: Omit<FormFieldProps, 'secureTextEntry' | 'trailing'>) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="password"
      textContentType="password"
      trailing={
        <IconButton
          icon={visible ? 'eye-off-outline' : 'eye-outline'}
          label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          color="textSecondary"
          size={20}
          onPress={() => setVisible((v) => !v)}
        />
      }
    />
  );
}
