import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockTicket } from '../mocks/sessionMock';
import { getUser, saveTicket } from '../services/sessionService';

export default function LinkTicketPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = getUser();

    if (!user) {
      navigate('/');
    }
  }, [navigate]);

  const handleLinkTicket = () => {
    saveTicket(mockTicket);
    navigate('/menu');
  };

  return (
    <div>
      <h1>Link Ticket</h1>
      <p>Fake ticket linking</p>
      <button onClick={handleLinkTicket}>Link ticket</button>
    </div>
  );
}