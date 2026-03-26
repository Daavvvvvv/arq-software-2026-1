import { useNavigate } from 'react-router-dom';
import { mockUser } from '../mocks/sessionMock';
import { saveUser } from '../services/sessionService';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    saveUser(mockUser);
    navigate('/link-ticket');
  };

  return (
    <div>
      <h1>Login</h1>
      <p>Temporal login</p>
      <button onClick={handleLogin}>Continue</button>
    </div>
  );
}