module Api
  class AccountsController < BaseController
    before_action :require_account

    def destroy
      current_user.destroy!
      clear_session
      head :no_content
    end
  end
end
