import { useNavigate } from 'react-router-dom';
import { mockTicket } from '../mocks/sessionMock';
import { saveTicket } from '../services/sessionService';

export default function LinkTicketPage() {
  const navigate = useNavigate();

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