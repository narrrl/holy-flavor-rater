import React, { useState, useEffect } from 'react';
import { 
    Container, Typography, Box, Button, 
    Stack, CircularProgress, Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useTitle } from '../hooks/useTitle';
import MentionTextField from '../components/MentionTextField';

const AdminReplyDetail: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [text, setText] = useState('');
    const [reply, setReply] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchReply = async () => {
        try {
            // We use the replies list/detail endpoint
            const res = await api.get(`replies/${id}/`);
            setReply(res.data);
            setText(res.data.text);
        } catch (err) {
            console.error(err);
            navigate('/admin-panel');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReply();
    }, [id]);

    useTitle(reply ? `${t('admin.manageReply')}` : 'Reply Management');

    const handleUpdate = async () => {
        try {
            await api.patch(`replies/${id}/`, { text });
            fetchReply();
            alert('Reply updated!');
        } catch (err) { alert('Update failed'); }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this reply?')) return;
        try {
            await api.delete(`replies/${id}/`);
            navigate('/admin-panel');
        } catch (err) { alert('Delete failed'); }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Button 
                variant="outlined" 
                startIcon={<ArrowBackIcon />} 
                onClick={() => navigate(-1)}
                sx={{ mb: 4, borderRadius: 2 }}
            >
                {t('common.back')}
            </Button>

            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4 }}>{t('admin.manageReply')}</Typography>

            <Paper sx={{ p: 3, borderRadius: 4 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Reply by {reply.user}
                </Typography>
                <Stack spacing={3} sx={{ mt: 3 }}>
                    <MentionTextField 
                        multiline rows={4} 
                        value={text} onChange={setText}
                    />
                    <Stack direction="row" spacing={2}>
                        <Button variant="contained" fullWidth onClick={handleUpdate}>{t('common.save')}</Button>
                        <Button variant="outlined" color="error" fullWidth startIcon={<DeleteIcon />} onClick={handleDelete}>{t('common.delete')}</Button>
                    </Stack>
                </Stack>
            </Paper>
        </Container>
    );
};

export default AdminReplyDetail;
