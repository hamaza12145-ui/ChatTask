import React from 'react';
import { UserProfileMenu } from './UserProfileMenu';

/**
 * UserSwitcher - Refactored to UserProfileMenu
 * Displays the authenticated user profile and logout option.
 */
export const UserSwitcher: React.FC = () => {
  return <UserProfileMenu />;
};
