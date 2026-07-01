import { useState, useCallback } from 'react';
import type { ClientRole } from '../types';

export const useClientRoles = () => {
    const [roles, setRoles] = useState<Record<string, ClientRole>>(() => {
        const stored = localStorage.getItem('melodiq_client_roles');
        return stored ? JSON.parse(stored) : {};
    });

    const getRole = useCallback((deviceId: string): ClientRole => {
        return roles[deviceId] || 'singer';
    }, [roles]);

    const setRole = useCallback((deviceId: string, role: ClientRole) => {
        setRoles(prev => {
            const next = { ...prev, [deviceId]: role };
            localStorage.setItem('melodiq_client_roles', JSON.stringify(next));
            // Trigger a global event so WebRTCHostContext can broadcast the updated roles
            window.dispatchEvent(new CustomEvent('melodiq_roles_updated', { detail: next }));
            return next;
        });
    }, []);

    return { roles, getRole, setRole };
};
