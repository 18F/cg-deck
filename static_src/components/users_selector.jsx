/**
 * Renders a form that allows org users to invite new users
 * to cloud.gov
 */

import PropTypes from "prop-types";
import React from "react";
import Action from "./action.jsx";
import FormStore from "../stores/form_store";
import { Form, FormSelect } from "./form";
import userActions from "../actions/user_actions";
import { validateString } from "../util/validators";

const AUDITOR_NAME = "auditors";
const SPACE_AUDITOR_NAME = "space_auditor";
const USERS_SELECTOR_GUID = "users-selector";

const propTypes = {
  usersSelectorDisabled: PropTypes.bool,
  currentUserAccess: PropTypes.bool,
  parentEntityUsers: PropTypes.array,
  error: PropTypes.object,
  parentEntity: PropTypes.string,
  currentEntityGuid: PropTypes.string,
  currentEntity: PropTypes.string
};
const defaultProps = {
  usersSelectorDisabled: false,
  currentUserAccess: false,
  error: {}
};

export default class UsersSelector extends React.Component {
  constructor(props) {
    super(props);

    this.validateString = validateString().bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidMount() {
    FormStore.create(USERS_SELECTOR_GUID);
  }

  handleSubmit(errs, values) {
    const { currentEntity } = this.props;
    const { currentEntityGuid } = this.props;
    const userRole = AUDITOR_NAME;
    const role = SPACE_AUDITOR_NAME;
    if (values.userGuid) {
      const userGuid = values.userGuid.value;
      userActions.addUserRoles(
        role,
        userRole,
        userGuid,
        currentEntityGuid,
        currentEntity
      );
    }
  }

  get invitationMessage() {
    const { parentEntity } = this.props;
    const { currentEntity } = this.props;

    return `Invite an existing ${parentEntity} user to this ${currentEntity}.`;
  }

  get userSelector() {
    const { parentEntityUsers } = this.props;
    const orgUsers = parentEntityUsers.map(user => ({
      value: user.guid,
      label: user.username
    }));

    if (!orgUsers) {
      return null;
    }

    return (
      <FormSelect
        formGuid={USERS_SELECTOR_GUID}
        classes={["test-users-selector-field"]}
        label="Username"
        name="userGuid"
        options={orgUsers}
        validator={this.validateString}
      />
    );
  }

  render() {
    const { usersSelectorDisabled } = this.props;
    const { currentEntity } = this.props;

    if (!this.props.currentUserAccess) {
      return null;
    }

    return (
      <div className="test-users-selector">
        {this.invitationMessage}
        <Form
          guid={USERS_SELECTOR_GUID}
          classes={["users_selector"]}
          onSubmit={this.handleSubmit}
        >
          {this.userSelector}
          <Action label="submit" type="submit" disabled={usersSelectorDisabled}>
            Add user to this {currentEntity}
          </Action>
        </Form>
      </div>
    );
  }
}

UsersSelector.propTypes = propTypes;

UsersSelector.defaultProps = defaultProps;
