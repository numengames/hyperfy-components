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

if (!app.isServer) {
  showPrivacyPolicy();
}

function showPrivacyPolicy() {
  policyUI = app.create('ui', {
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
  })

  // Create the title text
  const title = app.create('uitext', {
    value: props.title,
    fontSize: 18,
    fontWeight: 'bold',
    color: props.textColor,
    textAlign: 'center',
    margin: [0, 0, 10, 0],
  });
  policyUI.add(title);

  // Create the policy text
  const policyTextUI = app.create('uitext', {
    value: props.text,
    fontSize: 14,
    color: props.textColor,
    lineHeight: 1.4,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 5,
  });
  policyUI.add(policyTextUI);

  // Create a container for the buttons
  const buttonContainer = app.create('uiview', {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  });
  policyUI.add(buttonContainer);

  // Create the accept button
  const acceptButton = createButton(
    props.acceptLabelBtn, 
    props.acceptButtonColor, 
    props.textColor,
    handleAccept
  );
  buttonContainer.add(acceptButton);

  // Create the reject button
  const rejectButton = createButton(
    props.rejectText, 
    props.rejectButtonColor, 
    props.textColor,
    handleReject
  );
  buttonContainer.add(rejectButton);

  // Add the UI to the app
  app.add(policyUI);
}

// Helper function to create a button
function createButton(text, backgroundColor, textColor, onClick) {
  // Create the button container
  const button = app.create('uiview', {
    backgroundColor: backgroundColor,
    borderRadius: 5,
    padding: 10,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  });

  // Add the button text
  const buttonText = app.create('uitext', {
    value: text,
    fontSize: 14,
    color: textColor,
    fontWeight: 'bold',
    textAlign: 'center',
  });
  button.add(buttonText);

  // Add click event
  // button.on('click', onClick);

  return button;
}

// Handle accept button click
function handleAccept() {
  userChoice = 'accepted';
  console.log('Privacy policy accepted');
  hidePrivacyPolicy();
  // Here you can add your code to handle acceptance
  // For example, enable tracking or save the user's choice
}

// Handle reject button click
function handleReject() {
  userChoice = 'rejected';
  console.log('Privacy policy rejected');
  hidePrivacyPolicy();
  // Here you can add your code to handle rejection
  // For example, disable tracking or redirect to another page
}

// Hide the privacy policy dialog
function hidePrivacyPolicy() {
  if (policyUI) {
    policyUI.destroy();
    policyUI = null;
  }
}
