import React, { useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';

// Tutaj podpinamy pliki did dla poł z Internet Identity czyli metody poświadczania na Blockchainie IC za pomocą ChainKey.
import { createActor } from 'declarations/backend';
import { canisterId } from 'declarations/backend/index.js';
//Podłączamy backend w Motoko 

//Sprawdzamy sieć, ale w tym przypadku jest prod
const network = process.env.DFX_NETWORK;
const identityProvider =
  network === 'ic'
    ? 'https://identity.ic0.app' 
    : 'http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943'; 


const Button = ({ onClick, children, className }) => (
  <button onClick={onClick} className={className}>{children}</button>
);

//Główna zmienna logująca właściwie to 
const App = () => {
  // Authentication state
  const [state, setState] = useState({
    actor: undefined,                 //ref. do aktora komunikującego się z backendem 
    authClient: undefined,           // instancja połączenia z Internet Identity
    isAuthenticated: false,         // flaga przechowująca stan autoryzacji
    principal: '',                 //ID Principala ( unikalnego identyfikatora U na ICP )
    loginAttempts: 0,             // Zmienna zbierająca ilość zalogowań / prób zalogowań
    username: '',                //dla Pola loginu
    password: '',               // dla Pola hasła
    notRobot: false,           // zmienna logiczna dla sprawdzania czy U nie jest botem
    error: '',
    currentPage: 'home' //        stan bieżącej strony       
  });

  useEffect(() => {
    updateActor();
  }, []);

  const updateActor = async () => {
    const authClient = await AuthClient.create();
    const identity = authClient.getIdentity();
    const actor = createActor(canisterId, {
      agentOptions: {
        identity
      }
    });
    const isAuthenticated = await authClient.isAuthenticated();

    setState((prev) => ({
      ...prev,
      actor,
      authClient,
      isAuthenticated
    }));
  };

  const login = async (e) => {
    e.preventDefault();
    setState(prev => ({ ...prev, error: '' }));
    
    if (!state.notRobot) {
      setState(prev => ({ ...prev, error: 'Zaznacz Nie jestem Robotem 🤖' }));
      return;
    }

    if (!state.username || !state.password) {
      setState(prev => ({ ...prev, error: 'Wymagany Login i Haslo Gosciu 🤨' }));
      return;
    }

    if (state.username === 'admin' && state.password === 'admin') {
      await state.authClient.login({
        identityProvider,
        onSuccess: () => {
          updateActor();
          setState(prev => ({ 
            ...prev, 
            loginAttempts: 0,
            currentPage: 'admin'
          }));
        }
      });
    } else {
      const newAttempts = state.loginAttempts + 1;
      setState(prev => ({ 
        ...prev, 
        loginAttempts: newAttempts,
        error: 'Niepoprawny Login albo Haslo 🚨',
        currentPage: newAttempts >= 3 ? 'Zablokowalem' : prev.currentPage
      }));
    }
  };

  const logout = async () => {
    await state.authClient.logout();
    updateActor();
    setState(prev => ({ 
      ...prev, 
      loginAttempts: 0,
      currentPage: 'login',
      username: '',
      password: '',
      notRobot: false,
      error: ''
    }));
  };

  const whoami = async () => {
    if (!state.actor) return;
    
    setState(prev => ({ ...prev, principal: 'Loading...' }));
    const result = await state.actor.whoami();
    const principal = result.toString();
    setState(prev => ({ ...prev, principal }));
  };

  const resetAttempts = () => {
    setState(prev => ({ 
      ...prev, 
      loginAttempts: 0,
      currentPage: 'login',
      username: '',
      password: '',
      notRobot: false,
      error: ''
    }));
  };

  const navigateTo = (page) => {
    setState(prev => ({ ...prev, currentPage: page }));
  };

  
  const renderHome = () => (
    <div className="home-page">
      <h1>Zadanie 2 Logowanie</h1>
      <p>Wpisz login admin i haslo admin i zaloguj sie za pomoca Internet Identity 🪪</p>
      <Button onClick={() => navigateTo('login')} className="primary-btn">Zaloguj</Button>
    </div>
  );

  //Formatka Logowania
  const renderLoginForm = () => (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={login}>
        <div className="form-group">
          <label htmlFor="username">Login:</label>
          <input
            type="text"
            id="username"
            value={state.username}
            onChange={(e) => setState(prev => ({ ...prev, username: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Haslo:</label>
          <input
            type="password"
            id="password"
            value={state.password}
            onChange={(e) => setState(prev => ({ ...prev, password: e.target.value }))}
          />
        </div>
        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="not-robot"
            checked={state.notRobot}
            onChange={(e) => setState(prev => ({ ...prev, notRobot: e.target.checked }))}
          />
          <label htmlFor="not-robot">Nie jestem Robotem</label>
        </div>
        {state.error && <div className="error-message">{state.error}</div>}
        <Button type="submit" className="primary-btn">Login</Button>
      </form>
    </div>
  );

  // Render admin panel
  const renderAdminPanel = () => {
    if (!state.isAuthenticated) {
      navigateTo('login');
      return null;
    }

    return (
      <div className="admin-panel">
        <h1>Admin Panel</h1>
        <div className="admin-content">
          <h2>Siema Admin!</h2>
          <p>Super logowanie udane teraz Szwedzkie laski i szampan</p>
          <Button onClick={whoami} className="primary-btn">Sprawdz Principal ID</Button>
          {state.principal && (
            <div>
              <h3>Principal ID ( To unikalne na II) dla konta:</h3>
              <p className="principal">{state.principal}</p>
            </div>
          )}
        </div>
        <Button onClick={logout} className="logout-btn">Logout</Button>
      </div>
    );
  };

  
  const renderBlockedPage = () => (
    <div className="blocked-page">
      <h1>Dostep zablokowany</h1>
      <div className="blocked-content">
        <p>Zbyt wiele razy podjeto probe logowania sorry bloker (3).</p>
        <p>Twoje konto zostalo przyblokowane</p>
        <Button onClick={resetAttempts} className="primary-btn">Powrot do Logowania 🛴</Button>
      </div>
    </div>
  );


  let content;
  switch (state.currentPage) {
    case 'home':
      content = renderHome();
      break;
    case 'login':
      content = renderLoginForm();
      break;
    case 'admin':
      content = renderAdminPanel();
      break;
    case 'blocked':
      content = renderBlockedPage();
      break;
    default:
      content = renderHome();
  }

  return (
    <div className="app-container">
      {content}
    </div>
  );
};

export default App;