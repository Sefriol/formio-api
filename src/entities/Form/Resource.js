'use strict';

const _ = require('lodash');
const Resource = require('../../classes/Resource');

module.exports = class Form extends Resource {
  constructor(model, router, app) {
    super(model, router, app);
  }

  createDefaultActions(req, res) {
    return Promise.all(Object.keys(this.app.actions.submission).map(name => {
      const Action = this.app.actions.submission[name];
      const info = Action.info();
      // Add default actions to the form.
      if (info.default) {
        return this.app.models.Action.create(
          this.app.resources.Action.prepare({
            title: info.title,
            name: info.name,
            priority: info.priority,
            settings: {},
            ...info.defaults,
            entityType: 'form',
            entity: res.resource.item._id, // Entity goes last so they can't change it.
          }, req)
        );
      }
      else {
        return Promise.resolve();
      }
    }));
  }

  checkModifiedDate(req, res) {
    if (!req.body.hasOwnProperty('modified') || !req.body.hasOwnProperty('components')) {
      return Promise.resolve();
    }

    const current = new Date();
    const timeStable = new Date(_.get(req.context.resources.form, 'modified', current.getTime())).getTime();
    const timeLocal = new Date(_.get(req, 'body.modified', current.getTime())).getTime();
    if (timeStable <= timeLocal) {
      return Promise.resolve();
    }

    res.status(409).send(req.context.resources.form);
  }

  post(req, res, next) {
    this.callPromisesAsync([
      () => new Promise((resolve, reject) => {
        super.post(req, res, (err) => {
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      }),
      this.createDefaultActions.bind(this, req, res)
    ])
      .then(() => next())
      .catch(next);
  }

  put(req, res, next) {
    this.callPromisesAsync([
      this.checkModifiedDate.bind(this, req, res),
      () => new Promise((resolve, reject) => {
        super.put(req, res, (err) => {
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      }),
    ])
      .then(() => next())
      .catch(next);
  }
};
