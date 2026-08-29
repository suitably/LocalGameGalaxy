import React from 'react';
import { ServerConnection } from '../../../components/connection/ServerConnection';

/**
 * HelperConnection (Legacy alias)
 * Re-exports the generalized ServerConnection for backward compatibility.
 */
export const HelperConnection: React.FC = () => {
    return <ServerConnection />;
};
