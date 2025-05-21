import { configureStore, createSlice, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { io } from 'socket.io-client';

// --- Auth Slice ---
const auth_slice = createSlice({
  name: 'auth_state',
  initialState: {
    is_authenticated: false,
    auth_token: "",
    user: {}
  },
  reducers: {
    set_auth: (state, action) => {
      state.is_authenticated = action.payload.is_authenticated;
      state.auth_token = action.payload.auth_token;
      state.user = action.payload.user;
    },
    clear_auth: (state) => {
      state.is_authenticated = false;
      state.auth_token = "";
      state.user = {};
    }
  }
});

// --- Notification Slice ---
const notification_slice = createSlice({
  name: 'notification_state',
  initialState: [] as Array<{ id: string; type: string; message: string; timestamp: string }>,
  reducers: {
    add_notification: (state, action) => {
      state.push(action.payload);
    },
    clear_notifications: () => {
      return [];
    },
    remove_notification: (state, action) => {
      return state.filter(notification => notification.id !== action.payload);
    }
  }
});

// --- Realtime Event Slice ---
type RealtimeEventState = {
  last_slot_locked: { organizer_id: string; slot_start: string; slot_end: string; lock_expires_at: string } | null;
  last_appointment_created: {
    appointment_id: string;
    organizer_id: string;
    meeting_type_id: string;
    slot_start: string;
    slot_end: string;
    status: string;
    invitee: { name: string; email: string; phone: string }
  } | null;
  last_appointment_updated: {
    appointment_id: string;
    updated_fields: { status?: string; slot_start?: string; slot_end?: string };
    timestamp: string;
  } | null;
  last_availability_updated: { user_id: string; type: string; updated_entry: any; timestamp: string } | null;
};

const realtime_event_slice = createSlice({
  name: 'realtime_event_state',
  initialState: {
    last_slot_locked: null,
    last_appointment_created: null,
    last_appointment_updated: null,
    last_availability_updated: null
  } as RealtimeEventState,
  reducers: {
    set_last_slot_locked: (state, action) => {
      state.last_slot_locked = action.payload;
    },
    set_last_appointment_created: (state, action) => {
      state.last_appointment_created = action.payload;
    },
    set_last_appointment_updated: (state, action) => {
      state.last_appointment_updated = action.payload;
    },
    set_last_availability_updated: (state, action) => {
      state.last_availability_updated = action.payload;
    }
  }
});

// --- Data Cache Slice ---
const data_cache_slice = createSlice({
  name: 'data_cache_state',
  initialState: {
    profile: null,
    availabilities: [],
    meetingTypes: [],
    appointments: []
  },
  reducers: {
    set_profile: (state, action) => {
      state.profile = action.payload;
    },
    set_availabilities: (state, action) => {
      state.availabilities = action.payload;
    },
    set_meeting_types: (state, action) => {
      state.meetingTypes = action.payload;
    },
    set_appointments: (state, action) => {
      state.appointments = action.payload;
    }
  }
});

// --- Root Reducer ---
const root_reducer = combineReducers({
  auth_state: auth_slice.reducer,
  notification_state: notification_slice.reducer,
  realtime_event_state: realtime_event_slice.reducer,
  data_cache_state: data_cache_slice.reducer
});

// --- Redux Persist Config ---
const persist_config = {
  key: 'root',
  storage
};

const persisted_reducer = persistReducer(persist_config, root_reducer);

// --- Configure Store ---
const store = configureStore({
  reducer: persisted_reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// --- Persistor ---
export const persistor = persistStore(store);

// --- Realtime Socket Initialization ---
const socket = io(import.meta.env.VITE_API_BASE_URL);

socket.on("slot_locked", (payload: { organizer_id: string; slot_start: string; slot_end: string; lock_expires_at: string }) => {
  store.dispatch(realtime_event_slice.actions.set_last_slot_locked(payload));
});

socket.on("appointment_created", (payload: {
  appointment_id: string;
  organizer_id: string;
  meeting_type_id: string;
  slot_start: string;
  slot_end: string;
  status: string;
  invitee: { name: string; email: string; phone: string }
}) => {
  store.dispatch(realtime_event_slice.actions.set_last_appointment_created(payload));
});

socket.on("appointment_updated", (payload: {
  appointment_id: string;
  updated_fields: { status?: string; slot_start?: string; slot_end?: string };
  timestamp: string;
}) => {
  store.dispatch(realtime_event_slice.actions.set_last_appointment_updated(payload));
});

socket.on("availability_updated", (payload: { user_id: string; type: string; updated_entry: any; timestamp: string }) => {
  store.dispatch(realtime_event_slice.actions.set_last_availability_updated(payload));
});

// --- Export Actions ---
export const { set_auth, clear_auth } = auth_slice.actions;
export const { add_notification, clear_notifications, remove_notification } = notification_slice.actions;
export const { set_last_slot_locked, set_last_appointment_created, set_last_appointment_updated, set_last_availability_updated } =
  realtime_event_slice.actions;
export const { set_profile, set_availabilities, set_meeting_types, set_appointments } = data_cache_slice.actions;

// --- Export Store and Default Export ---
export { store };
export default store;