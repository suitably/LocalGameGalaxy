import { useHostFeedback } from '../hooks/useHostFeedback';

/** Mounts the host side of phone feedback (renders nothing). */
export const HostFeedbackBridge: React.FC = () => {
  useHostFeedback();
  return null;
};
