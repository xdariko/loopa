require "test_helper"

class ApiSetupTest < ActionDispatch::IntegrationTest
  test "reports a healthy application" do
    get "/up"

    assert_response :success
  end

  test "accepts API preflight requests from either Vite origin" do
    %w[http://127.0.0.1:5173 http://localhost:5173].each do |origin|
      options "/api/projects", headers: preflight_headers(origin)

      assert_response :success
      assert_equal origin, response.headers["Access-Control-Allow-Origin"]
    end
  end

  test "does not grant CORS access to unrelated origins" do
    options "/api/projects", headers: preflight_headers("https://example.invalid")

    assert_nil response.headers["Access-Control-Allow-Origin"]
  end

  test "stores and retrieves blobs on disk" do
    data = "test audio data"
    blob = ActiveStorage::Blob.create_and_upload!(
      io: StringIO.new(data),
      filename: "example.wav",
      content_type: "audio/wav",
      identify: false
    )

    assert_equal data, blob.download
  ensure
    blob&.purge
  end

  private

  def preflight_headers(origin)
    { "Origin" => origin, "Access-Control-Request-Method" => "POST" }
  end
end
