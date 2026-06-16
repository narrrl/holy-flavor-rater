import React, { useState, useEffect, useRef } from 'react';
import {
  TextField,
  Popper,
  Paper,
  MenuList,
  MenuItem,
  Avatar,
  ListItemAvatar,
  ListItemText,
  Box,
  alpha,
} from '@mui/material';
import api from '../lib/api';

interface UserSuggestion {
  id: number;
  username: string;
  avatar: string | null;
}

interface MentionTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fullWidth?: boolean;
  multiline?: boolean;
  rows?: number;
  size?: 'small' | 'medium';
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const MentionTextField: React.FC<MentionTextFieldProps> = ({
  value,
  onChange,
  placeholder,
  fullWidth = true,
  multiline = false,
  rows,
  size = 'small',
  onKeyDown,
}) => {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Fetch users for suggestions (we could cache this or search on demand)
  const [allUsers, setAllUsers] = useState<UserSuggestion[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('flavors/search/');
        const users = (res.data || [])
          .filter((item: any) => item.type === 'user')
          .map((item: any) => ({
            id: item.id,
            username: item.name,
            avatar: item.image_url,
          }));
        setAllUsers(users);
      } catch (err) {
        console.error('Failed to fetch users for mentions');
      }
    };
    fetchUsers();
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const selectionStart = e.target.selectionStart || 0;
    const textBeforeCursor = newValue.substring(0, selectionStart);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1) {
      const query = textBeforeCursor.substring(lastAtPos + 1);
      // Ensure there's no space or newline between @ and the cursor
      if (!query.includes(' ') && !query.includes('\n')) {
        const filtered = allUsers.filter((u) =>
          u.username.toLowerCase().startsWith(query.toLowerCase()),
        );
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setSelectedIndex(0);
        setAnchorEl(inputRef.current);
        return;
      }
    }
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = (user: UserSuggestion) => {
    const selectionStart = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, selectionStart);
    const textAfterCursor = value.substring(selectionStart);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    const newValue = value.substring(0, lastAtPos) + '@' + user.username + ' ' + textAfterCursor;

    onChange(newValue);
    setShowSuggestions(false);

    // Return focus to input and move cursor after the mention
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = lastAtPos + user.username.length + 2; // +1 for @, +1 for space
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      <TextField
        inputRef={inputRef}
        fullWidth={fullWidth}
        multiline={multiline}
        rows={rows}
        size={size}
        placeholder={placeholder}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        autoComplete="off"
      />
      <Popper
        open={showSuggestions}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ zIndex: 2000, width: 250 }}
      >
        <Paper
          elevation={8}
          sx={{
            mt: 1,
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <MenuList dense sx={{ py: 0 }}>
            {suggestions.map((user, index) => (
              <MenuItem
                key={user.id}
                selected={index === selectedIndex}
                onClick={() => handleSelectSuggestion(user)}
                sx={{
                  py: 1,
                  '&.Mui-selected': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                    '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.25) },
                  },
                }}
              >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Avatar
                    src={user.avatar || undefined}
                    sx={{ width: 28, height: 28, fontSize: '0.8rem' }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={user.username}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 700 }}
                />
              </MenuItem>
            ))}
          </MenuList>
        </Paper>
      </Popper>
    </Box>
  );
};

export default MentionTextField;
