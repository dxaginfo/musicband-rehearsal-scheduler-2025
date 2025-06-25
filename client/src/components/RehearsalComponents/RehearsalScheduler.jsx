import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, addHours } from 'date-fns';

const RehearsalScheduler = () => {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const [formValues, setFormValues] = useState({
    title: '',
    location: '',
    startTime: null,
    endTime: null,
    description: '',
    isRecurring: false,
    recurrencePattern: 'weekly',
    groupId: '',
  });

  // Mock data for groups
  const groups = [
    { id: 'group1', name: 'Jazz Ensemble' },
    { id: 'group2', name: 'String Quartet' },
    { id: 'group3', name: 'Rock Band' },
  ];

  useEffect(() => {
    // Mock fetching rehearsal data
    const fetchRehearsals = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock rehearsal data
        const mockRehearsals = [
          {
            id: '1',
            title: 'Jazz Rehearsal',
            start: new Date(2025, 5, 26, 18, 0),
            end: new Date(2025, 5, 26, 20, 0),
            extendedProps: {
              location: 'Studio A',
              description: 'Preparing for summer concert',
              groupId: 'group1'
            }
          },
          {
            id: '2',
            title: 'String Quartet Practice',
            start: new Date(2025, 5, 27, 14, 0),
            end: new Date(2025, 5, 27, 16, 0),
            extendedProps: {
              location: 'Room 203',
              description: 'Beethoven String Quartet No. 14',
              groupId: 'group2'
            }
          },
          {
            id: '3',
            title: 'Rock Band Session',
            start: new Date(2025, 5, 28, 19, 0),
            end: new Date(2025, 5, 28, 22, 0),
            extendedProps: {
              location: 'The Garage',
              description: 'New song development',
              groupId: 'group3'
            }
          }
        ];
        
        setEvents(mockRehearsals);
      } catch (err) {
        setError('Failed to load rehearsals. Please try again.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRehearsals();
  }, []);

  const handleDateClick = (arg) => {
    setSelectedDate(arg.date);
    setFormValues({
      ...formValues,
      startTime: arg.date,
      endTime: addHours(arg.date, 2)
    });
    setFormMode('create');
    setOpenDialog(true);
  };

  const handleEventClick = (info) => {
    const event = info.event;
    setSelectedEvent(event);
    setFormValues({
      title: event.title,
      location: event.extendedProps.location || '',
      description: event.extendedProps.description || '',
      startTime: event.start,
      endTime: event.end,
      isRecurring: false, // We'd get this from the actual event data
      recurrencePattern: 'weekly',
      groupId: event.extendedProps.groupId || '',
    });
    setFormMode('edit');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEvent(null);
    setFormValues({
      title: '',
      location: '',
      startTime: null,
      endTime: null,
      description: '',
      isRecurring: false,
      recurrencePattern: 'weekly',
      groupId: '',
    });
  };

  const handleFormChange = (e) => {
    const { name, value, checked } = e.target;
    setFormValues({
      ...formValues,
      [name]: name === 'isRecurring' ? checked : value
    });
  };

  const handleDateTimeChange = (name, value) => {
    setFormValues({
      ...formValues,
      [name]: value
    });
  };

  const handleSubmit = async () => {
    try {
      // Validate form
      if (!formValues.title || !formValues.startTime || !formValues.endTime || !formValues.groupId) {
        setError('Please fill in all required fields');
        return;
      }
      
      // Create new event object
      const newEvent = {
        id: formMode === 'create' ? `temp-${Date.now()}` : selectedEvent.id,
        title: formValues.title,
        start: formValues.startTime,
        end: formValues.endTime,
        extendedProps: {
          location: formValues.location,
          description: formValues.description,
          groupId: formValues.groupId,
          isRecurring: formValues.isRecurring,
          recurrencePattern: formValues.isRecurring ? formValues.recurrencePattern : null
        }
      };
      
      // In a real app, you would call an API here
      if (formMode === 'create') {
        setEvents([...events, newEvent]);
      } else {
        // Update existing event
        setEvents(events.map(event => 
          event.id === selectedEvent.id ? newEvent : event
        ));
      }
      
      handleCloseDialog();
    } catch (err) {
      setError('Failed to save rehearsal. Please try again.');
      console.error(err);
    }
  };

  const handleDeleteEvent = async () => {
    try {
      if (formMode === 'edit' && selectedEvent) {
        // In a real app, you would call an API here
        setEvents(events.filter(event => event.id !== selectedEvent.id));
        handleCloseDialog();
      }
    } catch (err) {
      setError('Failed to delete rehearsal. Please try again.');
      console.error(err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Rehearsal Scheduler
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Calendar View</Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              setFormMode('create');
              setFormValues({
                ...formValues,
                startTime: new Date(),
                endTime: addHours(new Date(), 2)
              });
              setOpenDialog(true);
            }}
          >
            New Rehearsal
          </Button>
        </Box>
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ height: '70vh' }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={events}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                editable={true}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                height="100%"
              />
            </LocalizationProvider>
          </Box>
        )}
      </Paper>

      {/* Rehearsal Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {formMode === 'create' ? 'Schedule New Rehearsal' : 'Edit Rehearsal'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="title"
                label="Rehearsal Title"
                fullWidth
                required
                value={formValues.title}
                onChange={handleFormChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Group</InputLabel>
                <Select
                  name="groupId"
                  value={formValues.groupId}
                  onChange={handleFormChange}
                  label="Group"
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Start Time"
                  value={formValues.startTime}
                  onChange={(newValue) => handleDateTimeChange('startTime', newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="End Time"
                  value={formValues.endTime}
                  onChange={(newValue) => handleDateTimeChange('endTime', newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                  minDateTime={formValues.startTime}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="location"
                label="Location"
                fullWidth
                value={formValues.location}
                onChange={handleFormChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formValues.description}
                onChange={handleFormChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="isRecurring"
                    checked={formValues.isRecurring}
                    onChange={handleFormChange}
                  />
                }
                label="Recurring Rehearsal"
              />
            </Grid>
            
            {formValues.isRecurring && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Recurrence Pattern</InputLabel>
                  <Select
                    name="recurrencePattern"
                    value={formValues.recurrencePattern}
                    onChange={handleFormChange}
                    label="Recurrence Pattern"
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="biweekly">Bi-weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          {formMode === 'edit' && (
            <Button onClick={handleDeleteEvent} color="error">
              Delete
            </Button>
          )}
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {formMode === 'create' ? 'Create' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RehearsalScheduler;