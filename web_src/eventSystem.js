// ====================================================================================================================
// class EventSystem
//
// Topic - maps a topic name and a default payload to a set of listener callbacks.
// TopicRegistry - maps topic names to topics and provides methods to add/remove listeners and fire events.
// listener - function pointer, self pointer and context to be called when an event is fired.
// payload - some data to be passed to a listener when an event is fired.
// removeId - optional unique identifier for a listener to help with removing it later.
//
// Usage:
//
//   const myTopicRegistry = new TopicRegistry();
//   myTopicRegistry.addListener('myTopic', (event) => console.log(event.topicName, event.payload), this);
//   myTopicRegistry.setDefaultPayload('myTopic', false);
//
//   myTopicRegistry.fireEvent('myTopic');
//
//   myTopicRegistry.removeListener('myTopic', this);
//   myTopicRegistry.removeTopic('myTopic');

// ====================================================================================================================
// class Topic
//
// A simple topic class that maps a topic name to a set of listeners and a default payload.
export class Topic {
  // Constructor for an empty topic
  constructor(topicName, defaultPayload) {
    this.topicName = topicName;
    this.defaultPayload = defaultPayload;

    // Map from from removeId to listener callback. removeId is either the callback function
    // pointer or a provided unique id (such as a class instance this pointer).
    this.listeners = new Map();
  }

  // Set the default payload for the topic. This will be used if fireEvent is called without a payload.
  setDefaultPayload(defaultPayload) {
    this.defaultPayload = defaultPayload;
  }

  // Call all listeners for the topic with the provided payload or default payload if none provided.
  fireEvent(payload) {
    this.listeners.forEach((listener) => listener(this.topicName, payload ?? this.defaultPayload));
  }
}

// ====================================================================================================================
// class TopicRegistry
//
// A simple topic registry that maps topic names to topics. Provides methods to add/remove listeners to fired events
// with a default payload.
export class TopicRegistry {
  // Constructor for an empty topic registry
  constructor() {
    this.topics = {};
  }

  // Returns true if there is at least one listener for the topicName
  hasListener(topicName) {
    return this.topics[topicName]?.listeners.size > 0;
  }

  // Add a listener callback for the specified topic. If listenerId is provided, it can be used to remove the listener later.
  addListener(topicName, listener, removeId = null) {
    if (typeof listener == 'function') {
      this.topics[topicName] ??= new Topic(topicName);
      this.topics[topicName].listeners.set(removeId ?? listener, listener);
    }
  }

  // Remove a listener for the specified topic. removeId can be the listener function pointer
  // or the previously provided removeId. If removeId is not provided, all listeners for the
  // topic will be removed.
  removeListener(topicName, removeId = null) {
    const topic = this.topics[topicName];
    if (!topic) {
      return;
    }
    if (removeId == null) {
      topic.listeners.clear();
      return;
    }
    if (!topic.listeners.delete(removeId)) {
      topic.listeners.forEach((l, key) => {
        if (l === removeId) {
          topic.listeners.delete(key);
        }
      });
    }
  }

  // Set the default payload for the specified topic. This will be used if fireEvent is called without a payload.
  setDefaultPayload(topicName, defaultPayload) {
    this.topics[topicName] ??= new Topic(topicName);
    this.topics[topicName].setDefaultPayload(defaultPayload);
  }

  // Returns default payload set for topic or undefined if none
  getDefaultPayload(topicName) {
    return this.topics[topicName]?.defaultPayload;
  }

  getTopics() {
    return Object.keys(this.topics);
  }

  // Remove the topic and all its listeners.
  removeTopic(topicName) {
    delete this.topics[topicName];
  }

  reset() {
    this.topics = {};
  }

  // Call all listeners for the specified topic with the provided payload or default payload if none provided.
  fireEvent(topicName, payload) {
    this.topics[topicName]?.fireEvent(payload);
  }
}
