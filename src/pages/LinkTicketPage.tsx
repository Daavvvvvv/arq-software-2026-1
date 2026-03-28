import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, saveTicket } from '../services/sessionService';
import { linkTicketRequest } from '../services/ticketService';
import './LinkTicketPage.css';

export default function LinkTicketPage() {
  const navigate = useNavigate();

  const [codigoQR, setCodigoQR] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const user = getUser();
    if (!user) {
      navigate('/');
    }
  }, [navigate]);

  const handleLinkTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      setErrorMessage('');

      const data = await linkTicketRequest(codigoQR);

      saveTicket(data);

      navigate('/menu');
    } catch (error) {
      console.error(error);
      setErrorMessage('No se pudo vincular la boleta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="link-page">
      <section className="link-card">

        <h1 className="link-title">Vincular boleta</h1>

        <p className="link-subtitle">
          Ingresa el código QR de tu entrada para continuar
        </p>

        <form className="link-form" onSubmit={handleLinkTicket}>
          <input
            type="text"
            className="link-input"
            placeholder="Ej: QR-ASISTENTE-001"
            value={codigoQR}
            onChange={(e) => setCodigoQR(e.target.value)}
            required
          />

          {errorMessage && (
            <p className="link-error">{errorMessage}</p>
          )}

          <button
            type="submit"
            className="link-button"
            disabled={isLoading}
          >
            {isLoading ? 'Vinculando...' : 'Vincular boleta'}
          </button>
        </form>

      </section>
    </main>
  );
}