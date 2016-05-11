
import http from 'axios';
import 'promises-done-polyfill';

import appActions from '../actions/app_actions.js';
import errorActions from '../actions/error_actions.js';
import loginActions from '../actions/login_actions.js';
import orgActions from '../actions/org_actions.js';
import spaceActions from '../actions/space_actions.js';
import serviceActions from '../actions/service_actions.js';
import userActions from '../actions/user_actions.js';

const APIV = '/v2';

export default {
  version: APIV,

  fetch(url, action, multiple, ...params) {
    return http.get(APIV + url).done((res) => {
      if (!multiple) {
        action(res.data, ...params);
      } else {
        action(res.data.resources, ...params);
      }
    }, (err) => {
      errorActions.errorFetch(err);
    });
  },

  fetchOne(url, action, ...params) {
    return this.fetch(url, action, false, ...params);
  },

  fetchMany(url, action, ...params) {
    return this.fetch(url, action, true, ...params);
  },

  getAuthStatus() {
    return http.get(`${APIV}/authstatus`).done((res) => {
      loginActions.receivedStatus(res.data.status);
    }, () => {
      loginActions.receivedStatus(false);
    });
  },

  fetchOrgLinks(guid) {
    return http.get(`${APIV}/organizations/${guid}`).then((res) =>
      res.data.entity);
  },

  fetchOrgSummary(guid) {
    return this.fetchOrgDetails(guid);
  },

  fetchOrgDetails(guid) {
    return http.get(`${APIV}/organizations/${guid}/summary`)
        .then((res) => res.data);
  },

  fetchOrg(guid) {
    let fullOrg = {};
    const req = Promise.all(
      [this.fetchOrgLinks(guid), this.fetchOrgDetails(guid)]);

    return req.then((res) => {
      fullOrg = Object.assign(...res);
      return Promise.all([
        this.fetchOrgMemoryUsage(guid),
        this.fetchOrgMemoryLimit(fullOrg)
      ]);
    }).then((res) => {
      let quota = {};
      quota = Object.assign(quota, ...res);
      fullOrg.quota = quota;
      orgActions.receivedOrg(fullOrg);
    }, (err) => {
      errorActions.errorFetch(err);
    });
  },

  fetchOrgMemoryUsage(guid) {
    return http.get(`${APIV}/organizations/${guid}/memory_usage`)
      .then((res) => res.data);
  },

  fetchOrgMemoryLimit(org) {
    return http.get(org.quota_definition_url)
      .then((res) => res.data.entity);
  },

  fetchOrgs() {
    return http.get(`${APIV}/organizations`).done((res) => {
      orgActions.receivedOrgs(res.data.resources);
    }, (err) => {
      errorActions.errorFetch(err);
    });
  },

  fetchOrgsSummaries(guids) {
    return Promise.all(guids.map((guid) => this.fetchOrgSummary(guid)))
    .then((res) => orgActions.receivedOrgsSummaries(res))
    .catch((err) => {
      errorActions.errorFetch(err);
    });
  },

  fetchSpace(spaceGuid) {
    return this.fetchOne(`/spaces/${spaceGuid}/summary`,
                         spaceActions.receivedSpace);
  },

  fetchServiceInstances(spaceGuid) {
    return this.fetchMany(`/spaces/${spaceGuid}/service_instances`,
                          serviceActions.receivedInstances);
  },

  createServiceInstance(name, spaceGuid, servicePlanGuid) {
    const payload = {
      name,
      space_guid: spaceGuid,
      service_plan_guid: servicePlanGuid
    };

    return http.post(`${APIV}/service_instances?accepts_incomplete=true`, payload)
      .done((res) => {
        serviceActions.createdInstance(res.data);
      }, (err) => {
        serviceActions.errorCreateInstance(err.data);
      });
  },

  deleteUnboundServiceInstance(serviceInstance) {
    return http.delete(serviceInstance.url)
    .done(() => {
      serviceActions.deletedInstance(serviceInstance.guid);
    }, () => {
      // Do nothing.
    });
  },

  fetchApp(appGuid) {
    return this.fetchOne(`/apps/${appGuid}/summary`,
                          appActions.receivedApp);
  },

  /**
   * Fetch all users that belong to a certain space.
   *
   * @param {Number} spaceGuid - The guid of the space that the users belong to.
   */
  fetchSpaceUsers(spaceGuid) {
    return this.fetchMany(`/spaces/${spaceGuid}/user_roles`,
                          userActions.receivedSpaceUsers,
                          spaceGuid);
  },

  /**
   * Fetch all users that belong to a certain space.
   *
   * @param {Number} orgGuid - The guid of the org that the users belong to.
   */
  fetchOrgUsers(orgGuid) {
    return this.fetchMany(`/organizations/${orgGuid}/users`,
                          userActions.receivedOrgUsers,
                          orgGuid);
  },

  fetchOrgUserRoles(orgGuid) {
    return this.fetchMany(`/organizations/${orgGuid}/user_roles`,
                          userActions.receivedOrgUserRoles,
                          orgGuid);
  },

  deleteUser(userGuid, orgGuid) {
    return http.delete(`${APIV}/organizations/${orgGuid}/users/${userGuid}`)
      .done(() => {
        userActions.deletedUser(userGuid, orgGuid);
      }, (err) => {
        userActions.errorRemoveUser(userGuid, err.data);
      });
  },

  // TODO deprecate possibly in favor of deleteOrgUserPermissions.
  deleteOrgUserCategory(userGuid, orgGuid, category) {
    return http.delete(`${APIV}/organizations/${orgGuid}/${category}
      /${userGuid}`).catch(() => {
        // TODO create correct error action.
      });
  },

  deleteOrgUserPermissions(userGuid, orgGuid, permissions) {
    return http.delete(`${APIV}/organizations/${orgGuid}/${permissions}
       /${userGuid}`).then((res) =>
        res.response
      , (err) => {
        userActions.errorRemoveUser(userGuid, err.data);
      });
  },

  putOrgUserPermissions(userGuid, orgGuid, permissions) {
    return http.put(`${APIV}/organizations/${orgGuid}/${permissions}
        /${userGuid}`).then((res) => res.response
    );
  },

  // TODO refactor with org user permissions
  putSpaceUserPermissions(userGuid, spaceGuid, role) {
    return http.put(`${APIV}/spaces/${spaceGuid}/${role}/${userGuid}`)
      .then((res) => res.response, () => {
        // TODO figure out error action
      });
  },

  // TODO refactor with org user permissions
  deleteSpaceUserPermissions(userGuid, spaceGuid, role) {
    return http.delete(`${APIV}/spaces/${spaceGuid}/${role}/${userGuid}`)
      .then((res) => res.response, (err) => {
        userActions.errorRemoveUser(userGuid, err.data);
      });
  },

  fetchAllServices(orgGuid) {
    return this.fetchMany(`/organizations/${orgGuid}/services`,
      serviceActions.receivedServices);
  },

  fetchAllServicePlans(serviceGuid) {
    return this.fetchMany(`/services/${serviceGuid}/service_plans`,
      serviceActions.receivedPlans);
  }

};
