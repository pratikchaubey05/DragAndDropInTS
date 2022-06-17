
// Project Type
enum ProjectStatus {
  Active, Finished
}
class Project {
  constructor(public id: string, public title: string,
     public description: string, public people: number,
      public status: ProjectStatus) {

  }
}

// Project state management
type Listener<T> = (items: T[]) => void;

// *N: for this project it's not required. But for bigger project there could be multiple states so there we can use inheritance and generics

class State<T> {
  protected listeners: Listener<T>[] = [];

  addListener(listenerFn: Listener<T>) {
    this.listeners.push(listenerFn);
  }
}
class ProjectState extends State<Project> {
  // listers array is required so when a change happens i.e., a project is added it detects and list itr
  private projects: Project[] = [];
  private static instance: ProjectState;

  // *N: Since the constructure is private we can create instance from outside. 
  // we can use static method to create one. part of making it
  private constructor() {
    super();
  }
  // *N: this is a way to create a singleton class. which is used to create only one instance. private constructure
  static getInstance() {
    if(this.instance){
      return this.instance;
    } else {
      this.instance = new ProjectState();
      return this.instance;
    }
  }

  addProject(title: string, description: string, numOfPeople: number) {
    const newProject = new Project(Math.random().toString(), title, description, numOfPeople, ProjectStatus.Active)
    this.projects.push(newProject);
    for (const listenerFn of this.listeners){
      listenerFn(this.projects.slice());
    }
  }
}

// *N: single instance to maintain a global state
const projectState = ProjectState.getInstance();


// Validation
//N: Adding ? makes it optional or we can just use or undefined
interface Validatable {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

function validate(validatableInput: Validatable) {
  let isValid = true;
  if (validatableInput.required) {
    isValid = isValid && validatableInput.value.toString().trim().length !== 0;
  }
  if (
    validatableInput.minLength != null &&
    typeof validatableInput.value === 'string'
  ) {
    isValid =
      isValid && validatableInput.value.length >= validatableInput.minLength;
  }
  if (
    validatableInput.maxLength != null &&
    typeof validatableInput.value === 'string'
  ) {
    isValid =
      isValid && validatableInput.value.length <= validatableInput.maxLength;
  }
  if (
    validatableInput.min != null &&
    typeof validatableInput.value === 'number'
  ) {
    isValid = isValid && validatableInput.value >= validatableInput.min;
  }
  if (
    validatableInput.max != null &&
    typeof validatableInput.value === 'number'
  ) {
    isValid = isValid && validatableInput.value <= validatableInput.max;
  }
  return isValid;
}

// autobind decorator
// using _ instead of name tells js that we are aware and we are not gonna use these value
function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const adjDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      const boundFn = originalMethod.bind(this);
      return boundFn;
    }
  }
  return adjDescriptor;
}

// Component Base Class

//*N: abstract is used so that it is only used for inheritance and not for create instance
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement;
  hostElement: T;
  element: U;

  constructor(templateId: string, hostElementID: string, insertAtStart:boolean, newElementsId?: string) {
    this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement;
    this.hostElement = document.getElementById(hostElementID)! as T;

    const importNode = document.importNode(this.templateElement.content, true);
    this.element = importNode.firstElementChild as U;
    // N: To add css
    if(newElementsId) {
    this.element.id = newElementsId;
    }

    this.attach(insertAtStart);
  }

  private attach(inserAtBeginning: boolean) {
    this.hostElement.insertAdjacentElement(inserAtBeginning?"afterbegin":"beforeend", this.element);
  }

  abstract configure(): void;
  abstract renderContent(): void;

}

// Project Item class

class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> {
  private project: Project;

  get persons() {
    if(this.project.people === 1) return "1 person";
    else return `${this.project.people} persons`
  }


  constructor(hostId: string, project: Project) {
    super("single-project", hostId, false, project.id);
    this.project = project;

    this.configure();
    this.renderContent();
  }

  configure(): void {
  }

  renderContent(): void {
    this.element.querySelector("h2")!.textContent = this.project.title;
    this.element.querySelector("h3")!.textContent = this.persons + " assigned";
    this.element.querySelector("p")!.textContent = this.project.description;
  }
}

// Project List class
class ProjectList extends Component<HTMLDivElement, HTMLElement> {
  assignedProjects: Project[];
  //*N: if constructor args has an accessor then it is treated a property of class
  constructor(private type: 'active' | 'finished') {
    super("project-list", "app", false,`${type}-projects`)
    this.assignedProjects = [];

    this.configure();
    this.renderContent();
  }

  configure(): void {
    projectState.addListener((projects: Project[]) => {
      const relevantProjects = projects.filter(prj => {
        if(this.type === "active") {
          return prj.status === ProjectStatus.Active;
        }
        return prj.status === ProjectStatus.Finished;
      });
      this.assignedProjects = relevantProjects;
      this.renderProjects();
    })
  }
  renderContent() {
    const listId = `${this.type}-projects-list`;
    this.element.querySelector("ul")!.id = listId;
    this.element.querySelector("h2")!.textContent = this.type.toUpperCase() + 'PROJECTS';

  }
  private renderProjects() {
    const listEl = document.getElementById(`${this.type}-projects-list`) as HTMLUListElement;
    listEl.innerHTML = "";
    for (const prjItem of this.assignedProjects) {
      new ProjectItem(this.element.querySelector("ul")!.id, prjItem);
    }
  }
}


// ProjectInput Class
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  titleInputElement: HTMLInputElement;
  descriptionInputElement: HTMLInputElement;
  peopleInputElement: HTMLInputElement;

  constructor() {
    super("project-input", "app", true, "user-input");

    this.titleInputElement = this.element.querySelector("#title") as HTMLInputElement ;
    this.descriptionInputElement = this.element.querySelector("#description") as HTMLInputElement ;
    this.peopleInputElement = this.element.querySelector("#people") as HTMLInputElement ;

    this.configure();
  }

  configure() {
    //Method1: using bind we can attach the this context. Method2 will be by using the decorator as we are using
    // this.element.addEventListener("submit", this.submitHandler.bind(this))
    this.element.addEventListener("submit", this.submitHandler);
  }

  renderContent(): void {
    
  }

  private gatherUserInput(): [string, string, number] | void {
    const enteredTitle = this.titleInputElement.value;
    const enteredDescription = this.descriptionInputElement.value;
    const enteredPeople = this.peopleInputElement.value;

    const titleValidatable: Validatable = {
      value: enteredTitle,
      required: true
    };
    const descriptionValidatable: Validatable = {
      value: enteredDescription,
      required: true,
      minLength: 5
    };
    const peopleValidatable: Validatable = {
      value: +enteredPeople,
      required: true,
      min: 1,
      max: 5
    };

    if (
      !validate(titleValidatable) ||
      !validate(descriptionValidatable) ||
      !validate(peopleValidatable)
    ) {
      alert('Invalid input, please try again!');
      return;
    } else {
      return [enteredTitle, enteredDescription, +enteredPeople];
    }
  }
  
  private clearInputs() {
    this.titleInputElement.value = "";
    this.descriptionInputElement.value = "";
    this.peopleInputElement.value = "";
  }

  @autobind
  private submitHandler(event: Event) {
    event.preventDefault();
    const userInput = this.gatherUserInput();
    if(Array.isArray(userInput)) {
      const [title, desc, people] = userInput;
      projectState.addProject(title, desc, people);
      this.clearInputs();
    }
  }
}

const prjInput = new ProjectInput();
const activePrjList = new ProjectList("active");
const finishedPrjList = new ProjectList("finished");