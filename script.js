'use strict';

// let map, mapEvent;

class Workout {
    date = new Date();
    //it's recommended to use additional libraries for generating IDs
    //for this project we generate ID from the date
    //create a UUID identifier - private field
    id = Date.now().toString(36)+Math.random().toString(36).slice(2);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords;     // [lat, lng]
        this.distance = distance; //in km
        this.duration = duration; //in min
    }

    _setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${new Intl.DateTimeFormat(navigator.language, {month:'short', day:'numeric'}).format(this.date)}`
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        //in min/km
        this.pace = this.duration / this.distance;
        return this.pace
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
    //in km/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed
    }
}
///////////////////////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE
// prettier-ignore
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const buttons = document.querySelector('.buttons');
const overviewBtn = document.querySelector('.buttons .btn-overview');
const clearAllBtn = document.querySelector('.buttons .btn-clear');
const confirmMsg = document.querySelector('.confirmation__msg ');
const yesBtn = document.querySelector('.yes__button');
const noBtn = document.querySelector('.no__button');
const deleteBtn = document.querySelector('.delete-btn');
const allowLocationMsg = document.querySelector('.allow_location_msg');
const addNewItemMsg = document.querySelector('.add_new_msg');

class App {
    #mapZoomLevel = 13;
    #map;
    #mapEvent;
    #workouts = [];
    #markers = [];
    constructor() {
    //Get User's position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //load Overview and Delete All buttons
   // this._loadControlButtons();
    
    //Attach event handlers
    //submit form after clicking the 'Enter' key
    //it's required to .bind(this) keyword because it points to the 'form' DOM element in the eventHandler
    form.addEventListener('submit', this._newWorkout.bind(this));
    form.reset();

    containerWorkouts.addEventListener('click', e => this._handleClick(e));

    //change the form fields while switching the Type field
    inputType.addEventListener('change', this._toggleElevationField);

    //delete one workout
    deleteBtn?.addEventListener('click', this._removeWorkout.bind(this));
    
    //clear workouts listeners
    clearAllBtn.addEventListener('click', this._showDeleteMsg);

    yesBtn.addEventListener('click', this._clearAll.bind(this));

    noBtn.addEventListener('click', () => confirmMsg.classList.add('hidden'));
    }

    _loadControlButtons() {
        this.#workouts.length !== 0 ? buttons.classList.remove('hidden') : buttons.classList.add('hidden');
    }
    _getPosition() {
    //Use Geolocation API
    //we use optional chaining to check if the current browser supports geolocation - for old browsers
    navigator.geolocation?.getCurrentPosition(this._loadMap.bind(this), function() {
    alert('Could not get your location. Please allow to access your location to use this application. Thank you.')
    });
    }

    _loadMap(position){
    addNewItemMsg.classList.remove('hidden');
    allowLocationMsg.classList.add('hidden');
    this._loadControlButtons();
    const {latitude} = position.coords;
    const {longitude} = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);


    //handling clicks on map
    // .on() method from the Leaflet Library, using instead of the .addEventListener()
    this.#map.on('click', this._showForm.bind(this));

     //to display workouts loaded from the local storage we can loop over them and then render on the map
    this.#workouts.forEach(work => {
        this._renderWorkoutMarker(work);
    });

    // overview button listener
    overviewBtn.addEventListener('click', this._overview.bind(this));
    }

    _handleClick(e) {
        this._moveToPopup(e);
        if (e.target.className.includes('delete-btn')) {
          let workoutId = e.target.closest('.workout').dataset.id;
          this._deleteWorkout(workoutId);
        }
      }
    
    _showForm(mapE){
          this.#mapEvent = mapE;
          form.classList.remove('hidden');
          addNewItemMsg.classList.add('hidden');
          inputDistance.focus();
    }

    _hideForm() {
        //clear input fields
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        // form.reset(); //it does not work here for the "Type" field properly
        
        //firstly we hide the form using 'display' property to deal withe form appearance animation (transition)
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }
    _toggleElevationField(){
            inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
            inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e){
        const validInputs = (...inputs) => inputs.every(input => Number.isFinite(input));
        const allPositive = (...inputs) => inputs.every(input => input>0);
        e.preventDefault();

        //get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const coordinates = [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng];
        let workout;

        //if workout is running - create a running object
        if(type === 'running') {
            const cadence = +inputCadence.value;
            //check if data is valid
            // if(!Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadence)) 
            if(!validInputs(distance,duration,cadence) || !allPositive(distance,duration,cadence))
            return alert('Inputs have to be positive numbers');
            workout = new Running(coordinates,distance, duration, cadence);
        }
        //if workout is cycling, create a cycling object
        if(type === 'cycling') {
            const elevation = +inputElevation.value;
            if(!validInputs(distance,duration,elevation) || !allPositive(distance,duration))
            return alert('Inputs have to be positive numbers');
            workout = new Cycling(coordinates,distance, duration, elevation);
        }     

        //add a new object to the workout array
        this.#workouts.push(workout);

        //render workout on the map as a marker
        this._renderWorkoutMarker(workout);         

        //render workout on the list
        this._renderWorkout(workout);      

        //hide the form and clear the input fields
        this._hideForm();

        //set local storage to all workouts
        this._setLocalStorage();

        //load Overview and Delete All buttons
        this._loadControlButtons();
    }
    _renderWorkoutMarker(workout) {
        const marker = L.marker(workout.coords, {riseOnHover:true});
        this.#markers.push(marker);
        marker.addTo(this.#map)
        .bindPopup(L.popup({
            maxWidth:250,
            minWidth:100,
            autoClose: false,
            closeOnClick: false,
            closePopupOnClick:false,
            closeButton: true,
           className: `${workout.type}-popup`,
        }))
        .setPopupContent((workout.type === 'running' ? '🏃‍♂️' : '🚵‍♀️') + workout.description)
        .openPopup()
        .on('click', function(e) {
            const selectedElID = workout.id;
            const workoutListEl = document.querySelector(`[data-id="${selectedElID}"]`);
            workoutListEl.style.backgroundColor = '#676D77';
            setTimeout(() => workoutListEl.style.backgroundColor = 'var(--color-dark--2)', 1000);
        });
    }

    _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${workout.id}">
    <div class="workout__title--container">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__controls">
        <i class="far fa-trash-alt delete-btn"></i>
        </div>
        </div>
        <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚵‍♀️'} </span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
        </div>`;

    if(workout.type === 'running')
    html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
        <span class="workout__icon">📈</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
        </div>`

    if(workout.type === 'cycling')
    html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
        <span class="workout__icon">🌄</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
        </div>`

    form.insertAdjacentHTML('afterend', html);
    }     
   
    _moveToPopup(e) {
        // BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
        if (!this.#map) return;
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;
        const workout = this.#workouts.find(
        work => work.id === workoutEl.dataset.id
        );
    
        //move to the selected marker
        // this.#map.setView(workout.coords, this.#mapZoomLevel, {
        //     animate: true,
        //     pan: {duration: 1},
        // });

        //move to the selected marker wth an animation
        this.#map.flyTo(workout.coords, this.#mapZoomLevel);

        //using the public interface count clicks
        workout.click();  //will not work with the local storage because of the lost prototype  inheritance; it is required to reset the prototype chain
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        if (!data) return;

        this.#workouts = data;
         //to display workouts loaded from the local storage we can loop over them and then render in the list
        this.#workouts.forEach(work => {
        this._renderWorkout(work);
        });
        //fix the prototype chain to use the public methods
        data.forEach(
            (it) =>
              (it.__proto__ = it.type === "running" ? Running.prototype : Cycling.prototype)
        );
    }

    //delete a single workout
    _deleteWorkout(id) {
        for (let i = 0; i < this.#workouts.length; i++) {
          if (this.#workouts[i].id == id) {
            this.#workouts.splice(i, 1);
            this.#markers[i].remove();
            this.#markers.splice(i, 1);
          }
        }
        document.querySelector(`[data-id="${id}"]`).remove();
        this._setLocalStorage();     
    }

    //delete all items from the local storage
    _showDeleteMsg(){
        confirmMsg.classList.remove('hidden');
    }
    _clearAll() {
        localStorage.removeItem('workouts');
        const workoutEls = document.querySelectorAll(".workouts > li");
        workoutEls.forEach(workout => this._deleteWorkout(workout.dataset.id));
        confirmMsg.classList.add('hidden');
        buttons.classList.add('hidden');
        addNewItemMsg.classList.remove('hidden');
    }
    
    //view all markers on the map
    _overview(){
        // if there are no workouts return
         if ((this.#workouts.length === 0)) return;
        // find lowest and highest lat and long to make map bounds that fit all markers
        const latitudes = this.#workouts.map(w => {return w.coords[0]})
        const longitudes = this.#workouts.map(w => {return w.coords[1]})
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLong = Math.min(...longitudes);
        const maxLong= Math.max(...longitudes);
        // fit bounds with coordinates
        this.#map.fitBounds([
            [maxLat, minLong],
            [minLat, maxLong]
        ],{padding:[70,70]});

    }
}

const app = new App();
