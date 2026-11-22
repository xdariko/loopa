ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

class ActionDispatch::IntegrationTest
  BROWSER_WRITE_HEADERS = { "X-Loopa-Request" => "1" }.freeze

  def register_project_owner
    post "/api/registration", params: { email: "owner@example.com", password: "test-password" },
      headers: BROWSER_WRITE_HEADERS, as: :json
    assert_response :created
    User.find_by!(email: "owner@example.com")
  end
end

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors, with: :threads)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...
  end
end
