import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff, Lock } from 'lucide-react';
import {
  getCurrentSupabaseUser,
  isSupabaseReady,
  onSupabaseAuthChange,
  updateSupabasePassword,
} from '../services/supabaseService';
import { sendPasswordChangedEmail } from '../services/emailService';

interface ResetPasswordProps {
  onBack: () => void;
  onPasswordReset: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onBack, onPasswordReset }) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!isSupabaseReady()) {
      setError('El servicio de cuenta no esta configurado.');
      return;
    }

    let isMounted = true;

    const loadRecoverySession = async () => {
      try {
        const supabaseUser = await getCurrentSupabaseUser();
        if (!isMounted) return;

        if (supabaseUser) {
          setTokenValid(true);
          setUserName(supabaseUser.name);
          setError('');
        } else {
          setError('Abre esta pantalla desde el enlace de recuperacion enviado por email.');
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo validar el enlace.');
        }
      }
    };

    const subscription = onSupabaseAuthChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        await loadRecoverySession();
      }
    });

    loadRecoverySession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsResetting(true);

    try {
      if (!isSupabaseReady()) {
        throw new Error('El servicio de cuenta no esta configurado.');
      }

      await updateSupabasePassword(formData.newPassword);
      void sendPasswordChangedEmail();
      setResetComplete(true);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Error al actualizar la contraseña.');
    } finally {
      setIsResetting(false);
    }
  };

  if (resetComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Contraseña actualizada</h2>
          <p className="text-gray-600 mb-6">
            Tu contraseña fue cambiada correctamente{userName ? `, ${userName}` : ''}.
          </p>
          <button
            onClick={onPasswordReset}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200"
          >
            Ir a iniciar sesion
          </button>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Enlace invalido</h2>
          <p className="text-gray-600 mb-6">
            {error || 'El enlace de recuperacion expiro o no es valido.'}
          </p>
          <button
            onClick={onBack}
            className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver</span>
        </button>

        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Cambiar contraseña</h2>
          <p className="text-gray-600">Ingresa tu nueva contraseña.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type={showPasswords.new ? 'text' : 'password'}
              placeholder="Nueva contraseña"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPasswords((current) => ({ ...current, new: !current.new }))}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              placeholder="Confirmar nueva contraseña"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPasswords((current) => ({ ...current, confirm: !current.confirm }))}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isResetting || formData.newPassword.length < 6 || formData.newPassword !== formData.confirmPassword}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Lock className="h-5 w-5" />
            <span>{isResetting ? 'Actualizando...' : 'Cambiar contraseña'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
