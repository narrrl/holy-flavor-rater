import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/date';
import { useAdminJobs } from '../../api/queries/useAdminQueries';
import { useTriggerJob, useUpdateJobSchedule } from '../../api/mutations/useAdminMutations';

interface Job {
  id: number;
  name: string;
  name_display: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  last_run: string | null;
  next_run: string | null;
  interval_hours: number;
  last_output: string;
  error_message: string;
}

const AdminJobs = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const { data: jobs = [], isLoading } = useAdminJobs() as unknown as {
    data: Job[];
    isLoading: boolean;
  };
  const triggerJobMutation = useTriggerJob();
  const updateJobScheduleMutation = useUpdateJobSchedule();

  useEffect(() => {
    const anyRunning = jobs.some((j) => j.status === 'running' || j.status === 'pending');
    if (anyRunning) {
      const interval = setInterval(() => {
        qc.invalidateQueries({ queryKey: ['adminJobs'] });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [jobs, qc]);

  const handleTriggerJob = async (id: number) => {
    try {
      await triggerJobMutation.mutateAsync(id);
      notify({ message: t('admin.jobQueued'), severity: 'success' });
    } catch {
      notify({ message: t('admin.jobTriggerFailed'), severity: 'error' });
    }
  };

  const handleUpdateJobSchedule = async (id: number, interval: number) => {
    try {
      await updateJobScheduleMutation.mutateAsync({ id, data: { interval_hours: interval } });
    } catch {
      notify({ message: t('admin.jobScheduleFailed'), severity: 'error' });
    }
  };

  const filtered = jobs.filter(
    (j) =>
      j.name_display.toLowerCase().includes(search.toLowerCase()) ||
      j.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        sx={{ mb: 3 }}
        spacing={2}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('admin.jobsTitle')} ({filtered.length})
        </Typography>
        <TextField
          size="small"
          placeholder={t('admin.jobsFilter')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', md: 300 } }}
        />
      </Stack>

      <Stack spacing={3}>
        {filtered.map((job) => (
          <GlassCard
            key={job.id}
            sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {job.name_display}
                </Typography>
                <Chip
                  label={
                    job.status === 'pending' ? t('admin.jobStatusQueued') : job.status.toUpperCase()
                  }
                  size="small"
                  color={
                    job.status === 'completed'
                      ? 'success'
                      : job.status === 'running'
                        ? 'info'
                        : job.status === 'failed'
                          ? 'error'
                          : 'default'
                  }
                  variant={job.status === 'running' ? 'filled' : 'outlined'}
                />
              </Box>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('admin.jobLastRun')}
                  </Typography>
                  <Typography variant="body2">
                    {job.last_run ? formatDate(job.last_run) : t('admin.jobNever')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('admin.jobNextRun')}
                  </Typography>
                  <Typography variant="body2">
                    {job.next_run
                      ? formatDate(job.next_run)
                      : job.interval_hours > 0
                        ? t('admin.jobQueuedShort')
                        : t('admin.jobDisabled')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mb: 0.5 }}
                  >
                    {t('admin.jobSchedule')}
                  </Typography>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={job.interval_hours}
                      onChange={(e) => handleUpdateJobSchedule(job.id, Number(e.target.value))}
                      sx={{ height: 32, fontSize: '0.875rem' }}
                    >
                      <MenuItem value={0}>{t('admin.jobDisabled')}</MenuItem>
                      <MenuItem value={1}>{t('admin.schedHourly')}</MenuItem>
                      <MenuItem value={6}>{t('admin.sched6h')}</MenuItem>
                      <MenuItem value={12}>{t('admin.sched12h')}</MenuItem>
                      <MenuItem value={24}>{t('admin.schedDaily')}</MenuItem>
                      <MenuItem value={168}>{t('admin.schedWeekly')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {job.last_output && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    {t('admin.jobLastOutput')}
                  </Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: '#1e1e1e',
                      color: '#d4d4d4',
                      borderRadius: 2,
                      maxHeight: 150,
                      overflowY: 'auto',
                      border: '1px solid #333',
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {job.last_output}
                    </pre>
                  </Box>
                </Box>
              )}

              {job.error_message && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="error" display="block" gutterBottom>
                    {t('admin.jobLastError')}
                  </Typography>
                  <Alert severity="error" sx={{ py: 0 }}>
                    {job.error_message}
                  </Alert>
                </Box>
              )}

              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                disabled={job.status === 'running'}
                onClick={() => handleTriggerJob(job.id)}
              >
                {t('admin.jobTriggerNow')}
              </Button>
            </CardContent>
          </GlassCard>
        ))}
      </Stack>
    </Box>
  );
};

export default AdminJobs;
