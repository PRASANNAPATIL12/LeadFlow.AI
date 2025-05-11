import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // Add any specific button props here
}

export const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <button {...props}>{children}</button>
  );
};
