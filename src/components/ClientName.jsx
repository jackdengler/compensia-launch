// src/ClientName.jsx
import { useRef, useEffect } from 'react';
import { Heading } from '@chakra-ui/react';

export default function ClientName({ setLogoUrl }) {
  const ref = useRef(null);

  // Set default name + logo on first load
  useEffect(() => {
    if (ref.current) {
      const defaultName = 'Client Name';
      ref.current.innerText = defaultName;
      updateLogo(defaultName);
    }
  }, []);

  // Create domain and update logo URL
  const updateLogo = (name) => {
    const domain = name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^\w]/g, '') + '.com';
    const logo = `https://logo.clearbit.com/${domain}`;
    setLogoUrl(logo);
  };

  // Handle text changes
  const handleInput = (e) => {
    const newName = e.target.innerText.trim();
    updateLogo(newName);
  };

  // Select all text on click
  const handleClick = () => {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(ref.current);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  return (
    <Heading
      as="h1"
      size="2xl"
      textAlign="center"
      contentEditable
      suppressContentEditableWarning
      ref={ref}
      onInput={handleInput}
      onClick={handleClick}
      cursor="text"
      pl="400px"
    />
  );
}