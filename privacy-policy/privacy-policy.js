// Configuration options for customization
app.configure([
    {
      key: 'title',
      type: 'text',
      label: 'title',
      hint: 'The title of the privacy policy',
      initial: 'Privacy Policy',
    },
    {
      key: 'text',
      type: 'text',
      label: 'text',
      hint: 'The text that it will be shown.',
      initial: 'Initial description',
    },
    {
      key: 'acceptLabelBtn',
      type: 'text',
      label: 'Texto del botón Aceptar',
      hint: 'El texto que se mostrará en el botón de aceptar.',
      initial: 'Aceptar',
    },
    {
      key: 'rejectText',
      type: 'text',
      label: 'Texto del botón Rechazar',
      hint: 'El texto que se mostrará en el botón de rechazar.',
      initial: 'Rechazar',
    },
    {
      key: 'backgroundColor',
      type: 'color',
      label: 'Color de Fondo',
      hint: 'El color de fondo del diálogo de política de privacidad.',
      initial: 'rgba(0, 0, 0, 0.7)',
    },
    {
      key: 'textColor',
      type: 'color',
      label: 'Color del Texto',
      hint: 'El color del texto de la política de privacidad.',
      initial: 'white',
    },
    {
      key: 'acceptButtonColor',
      type: 'color',
      label: 'Color del Botón Aceptar',
      hint: 'El color de fondo del botón de aceptar.',
      initial: 'rgba(0, 128, 0, 0.7)',
    },
    {
      key: 'rejectButtonColor',
      type: 'color',
      label: 'Color del Botón Rechazar',
      hint: 'El color de fondo del botón de rechazar.',
      initial: 'rgba(128, 0, 0, 0.7)',
    }
  ]);
  
  // Keep track of whether the user has made a choice
  let userChoice = null;
  let policyUI = null;
  
  // Create the privacy policy dialog when the app starts
  
  if (world.isServer) {
    console.log('[SERVER] Inicializando servidor de política de privacidad');
    
    // Verificar si ya existe un valor guardado para cookies
    const initialCookieValue = world.get('acceptedCookies');
    console.log('[SERVER] Valor inicial de cookies:', initialCookieValue);
    
    app.on('areCookiesDefined', (response) => {
      const cookiesValue = world.get('acceptedCookies');
      console.log('[SERVER] Recibida solicitud areCookiesDefined. Valor actual:', cookiesValue);
      console.log('[SERVER] Tipo de dato del callback:', typeof response);
      
      try {
        // Enviar explícitamente un valor booleano o null
        const valueToSend = cookiesValue === true ? true : 
                            cookiesValue === false ? false : null;
        console.log('[SERVER] Enviando respuesta:', valueToSend);
        response(valueToSend);
        console.log('[SERVER] Respuesta enviada correctamente');
      } catch (error) {
        console.error('[SERVER] Error al enviar respuesta:', error);
      }
    });

    app.on('storeCookies', (data) => {
      console.log('[SERVER] Recibido storeCookies:', data);
      
      if (data && typeof data.value !== 'undefined') {
        console.log('[SERVER] Guardando valor de cookies:', data.value);
        world.set('acceptedCookies', data.value);
        console.log('[SERVER] Cookies guardadas. Nuevo valor:', world.get('acceptedCookies'));
      } else {
        console.error('[SERVER] Error: storeCookies recibió datos inválidos');
      }
    });
  } else if (world.isClient) {
    console.log('[CLIENT] Inicializando cliente de política de privacidad');
    
    const policyUI = app.create('ui', {
      space: 'screen',
      position: [1, 1, 0],
      width: 350,
      height: 250,
      backgroundColor: props.backgroundColor,
      borderRadius: 10,
      padding: 20,
      pivot: 'bottom-right',
      offset: [-20, -20, 0],
      flexDirection: 'column',
      gap: 15,
      active: false // Inicialmente oculta hasta conocer el estado
    });

    const title = app.create('uitext', {
      value: props.title,
      fontSize: 18,
      fontWeight: 'bold',
      color: props.textColor,
      textAlign: 'center',
      margin: [0, 0, 10, 0],
    });

    const policyTextUI = app.create('uitext', {
      value: props.text,
      fontSize: 14,
      color: props.textColor,
      lineHeight: 1.4,
      padding: 10,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 5,
    });

    const buttonContainer = app.create('uiview', {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 10,
    });

    const acceptButton = createButton(
      props.acceptLabelBtn, 
      props.acceptButtonColor, 
      props.textColor,
      () => handleAccept(policyUI)
    );

    const rejectButton = createButton(
      props.rejectText, 
      props.rejectButtonColor, 
      props.textColor,
      () => handleReject(policyUI)
    );

    buttonContainer.add(acceptButton);
    buttonContainer.add(rejectButton);

    policyUI.add(title);
    policyUI.add(policyTextUI);
    policyUI.add(buttonContainer);

    app.add(policyUI);

    console.log('[CLIENT] Enviando solicitud areCookiesDefined');
    
    // Probar dos formas diferentes de enviar el callback
    app.send('areCookiesDefined', (areDefined) => {
      console.log('[CLIENT] Callback recibido con valor:', areDefined);
      
      // Si es null o undefined, mostrar la política (cookies no definidas)
      if (areDefined === null || areDefined === undefined) {
        console.log('[CLIENT] Cookies no definidas, mostrando política');
        policyUI.active = true;
      } else {
        console.log('[CLIENT] Cookies ya definidas, ocultando política');
        policyUI.active = false;
      }
    });
    
    // Prueba alternativa después de un retraso
    setTimeout(() => {
      console.log('[CLIENT] Intentando nuevamente areCookiesDefined después de 2 segundos');
      app.send('areCookiesDefined', function callbackDirecto(response) {
        console.log('[CLIENT] Segundo intento: callback recibido con valor:', response);
      });
    }, 2000);
  }
  
  function createButton(text, backgroundColor, textColor, onClick) {
    const button = app.create('uiview', {
      backgroundColor: backgroundColor,
      borderRadius: 5,
      padding: 10,
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
    });
  
    const buttonText = app.create('uitext', {
      value: text,
      fontSize: 14,
      color: textColor,
      fontWeight: 'bold',
      textAlign: 'center',
    });
    button.add(buttonText);
  
    button.pointerdown = onClick;
  
    return button;
  }
  
  function handleAccept(policyUI) {
    console.log('Privacy policy accepted');
    app.send('storeCookies', { value: true });
    if (policyUI) policyUI.active = false;
  }
  
  function handleReject(policyUI) {
    console.log('Privacy policy rejected');
    app.send('storeCookies', { value: false });
    if (policyUI) policyUI.active = false;
  }
  
  // Hide the privacy policy dialog
  function hidePrivacyPolicy() {
    if (policyUI) {
      // Asegurarse de quitar correctamente la UI
      app.remove(policyUI);
      policyUI.destroy();
      policyUI = null;
    }
  }